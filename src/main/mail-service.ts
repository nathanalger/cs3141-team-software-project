import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail } from 'mailparser';
import type {
   AccountCredentials,
   EmailAddress,
   FetchEmailsRequest,
   FetchedEmail,
   MailConnectionResult,
   MailConnectionStatus,
   SendEmailRequest,
   SendEmailResult,
} from '../shared/email';
import type { EmailAddress, EmailMessage, StoredEmail } from '../types/email';
import { AccountDao } from './dao/AccountDao';

const CONNECTION_TIMEOUT_MS = 10_000;

function errorMessage(error: unknown): string {
   if (error instanceof Error) return error.message;
   return 'An unknown connection error occurred';
}

function createImapClient(account: AccountCredentials): ImapFlow {
   return new ImapFlow({
      host: account.imapHost,
      port: account.imapPort,
      secure: account.imapSecurity === 'tls',
      doSTARTTLS: account.imapSecurity === 'starttls',
      auth: {
         user: account.imapUser ?? account.email,
         pass: account.imapPassword,
      },
      tls: { rejectUnauthorized: true },
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      greetingTimeout: CONNECTION_TIMEOUT_MS,
      socketTimeout: CONNECTION_TIMEOUT_MS,
      logger: false,
   });
}

async function testImapConnection(account: AccountCredentials): Promise<MailConnectionStatus> {
   if (!account.imapPassword) {
      return {
         service: 'IMAP',
         accountEmail: account.email,
         success: false,
         message: 'No IMAP password is stored for this account.',
      };
   }

   let client: ImapFlow | undefined;
   let connected = false;

   try {
      client = createImapClient(account);
      await client.connect();
      connected = true;
      const mailboxes = await client.list();
      return {
         service: 'IMAP',
         accountEmail: account.email,
         success: true,
         message: `Connection and authentication succeeded (${mailboxes.length} mailbox${mailboxes.length === 1 ? '' : 'es'} found).`,
      };
   } catch (error) {
      return { service: 'IMAP', accountEmail: account.email, success: false, message: errorMessage(error) };
   } finally {
      if (client && connected) {
         try {
            await client.logout();
         } catch {
            // Logout errors do not change the result of the completed connection test.
         }
      }
   }
}

function toEmailAddresses(addresses: { name?: string; address?: string }[] | undefined): EmailAddress[] {
   return (addresses ?? [])
      .filter((item): item is { name?: string; address: string } => Boolean(item.address))
      .map(({ name, address }) => ({ address, ...(name ? { name } : {}) }));
}

function toEmailAddressesFromField(
   field: ParsedMail['from'] | ParsedMail['to'] | ParsedMail['cc'] | ParsedMail['bcc'] | ParsedMail['replyTo'],
): EmailAddress[] {
   const addressObjects = Array.isArray(field) ? field : field ? [field] : [];
   return addressObjects.flatMap(({ value }) => toEmailAddresses(value));
}

function toEmailMessage(parsed: Awaited<ReturnType<typeof simpleParser>>, uid: number): EmailMessage {
   const references = parsed.references
      ? Array.isArray(parsed.references)
         ? parsed.references
         : [parsed.references]
      : [];

   return {
      id: parsed.messageId || String(uid),
      ...(parsed.messageId ? { messageId: parsed.messageId } : {}),
      from: toEmailAddressesFromField(parsed.from),
      to: toEmailAddressesFromField(parsed.to),
      cc: toEmailAddressesFromField(parsed.cc),
      bcc: toEmailAddressesFromField(parsed.bcc),
      replyTo: toEmailAddressesFromField(parsed.replyTo),
      subject: parsed.subject ?? '',
      ...(parsed.text ? { text: parsed.text } : {}),
      ...(typeof parsed.html === 'string' ? { html: parsed.html } : {}),
      ...(parsed.date ? { date: parsed.date } : {}),
      ...(parsed.inReplyTo ? { inReplyTo: parsed.inReplyTo } : {}),
      references,
   };
}

/** Fetches the newest messages from the selected account's mailbox. */
export async function fetchEmails(request: FetchEmailsRequest = {}): Promise<StoredEmail[]> {
   const account = new AccountDao().getForMailOperations(request.accountID);
   if (!account.imapPassword) throw new Error(`No IMAP password is stored for ${account.email}.`);

   const mailbox = request.mailbox?.trim() || 'INBOX';
   const limit = request.limit ?? 50;
   if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      throw new Error('The email limit must be a whole number between 1 and 200.');
   }

   const client = createImapClient(account);
   let connected = false;
   try {
      await client.connect();
      connected = true;
      const lock = await client.getMailboxLock(mailbox, { readOnly: true });
      try {
         const state = client.mailbox;
         if (!state) throw new Error(`The ${mailbox} mailbox could not be opened.`);
         if (state.exists === 0) return [];

         const firstSequence = Math.max(1, state.exists - limit + 1);
         const fetched = await client.fetchAll(`${firstSequence}:*`, {
            uid: true,
            envelope: true,
            flags: true,
            internalDate: true,
            size: true,
            source: true,
         });
         const uidValidity = Number(state.uidValidity);
         const emails = await Promise.all(fetched.map(async (item): Promise<StoredEmail> => {
            if (!item.source) throw new Error(`The IMAP server did not return message source for UID ${item.uid}.`);
            const parsed = await simpleParser(item.source);
            return {
               message: toEmailMessage(parsed, item.uid),
               mailbox,
               uid: item.uid,
               uidValidity,
               flags: item.flags ?? new Set<string>(),
               ...(item.internalDate
                  ? { internalDate: item.internalDate instanceof Date ? item.internalDate : new Date(item.internalDate) }
                  : {}),
               ...(item.size !== undefined ? { size: item.size } : {}),
            };
         }));
         return emails.sort((left, right) => right.uid - left.uid);
      } finally {
         lock.release();
      }
   } finally {
      if (connected) await client.logout();
   }
}

/** Sends an email with the selected account's stored SMTP configuration. */
export async function sendEmail(request: SendEmailRequest): Promise<SendEmailResult> {
   const account = new AccountDao().getForMailOperations(request.accountID);
   if (!account.smtpHost) throw new Error(`No SMTP server is configured for ${account.email}.`);
   if (account.smtpUser && !account.smtpPassword) {
      throw new Error(`No SMTP password is stored for ${account.email}.`);
   }
   if (!request.to.length) throw new Error('At least one recipient is required.');

   const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort,
      secure: account.smtpSecurity === 'tls',
      requireTLS: account.smtpSecurity === 'starttls',
      ...(account.smtpUser
         ? { auth: { user: account.smtpUser, pass: account.smtpPassword ?? '' } }
         : {}),
      tls: { rejectUnauthorized: true },
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      greetingTimeout: CONNECTION_TIMEOUT_MS,
      socketTimeout: CONNECTION_TIMEOUT_MS,
   });

   try {
      const result = await transporter.sendMail({
         from: {
            name: account.displayName || `${account.fName} ${account.lName}`,
            address: account.email,
         },
         to: request.to,
         ...(request.cc?.length ? { cc: request.cc } : {}),
         ...(request.bcc?.length ? { bcc: request.bcc } : {}),
         subject: request.subject,
         text: request.text,
         ...(request.html ? { html: request.html } : {}),
      });
      return { messageId: result.messageId };
   } finally {
      transporter.close();
   }
}

async function testSmtpConnection(account: AccountCredentials): Promise<MailConnectionStatus> {
   if (!account.smtpHost) {
      return {
         service: 'SMTP',
         accountEmail: account.email,
         success: false,
         message: 'No SMTP server is configured for this account.',
      };
   }

   if (account.smtpUser && !account.smtpPassword) {
      return {
         service: 'SMTP',
         accountEmail: account.email,
         success: false,
         message: 'No SMTP password is stored for this account.',
      };
   }

   try {
      const transporter = nodemailer.createTransport({
         host,
         port,
         secure: port === 465,
         requireTLS: port !== 465,
         auth: {
            user: requiredEnv('SMTP_USER'),
            pass: requiredEnv('SMTP_PASSWORD'),
         },
         host: account.smtpHost,
         port: account.smtpPort,
         secure: account.smtpSecurity === 'tls',
         requireTLS: account.smtpSecurity === 'starttls',
         ...(account.smtpUser
            ? { auth: { user: account.smtpUser, pass: account.smtpPassword ?? '' } }
            : {}),
         tls: { rejectUnauthorized: true },
         connectionTimeout: CONNECTION_TIMEOUT_MS,
         greetingTimeout: CONNECTION_TIMEOUT_MS,
         socketTimeout: CONNECTION_TIMEOUT_MS,
      });

      try {
         await transporter.verify();
      } finally {
         transporter.close();
      }

      return {
         service: 'SMTP',
         accountEmail: account.email,
         success: true,
         message: account.smtpUser
            ? `Connection and authentication succeeded on port ${account.smtpPort}.`
            : `Connection succeeded on port ${account.smtpPort}.`,
      };
   } catch (error) {
      return { service: 'SMTP', accountEmail: account.email, success: false, message: errorMessage(error) };
   }
}

/** Tests stored account connections without exposing credentials to the renderer. */
export async function testMailConnections(): Promise<MailConnectionResult> {
   const accounts = new AccountDao().getForConnectionTests();
   if (!accounts.length) {
      return {
         success: false,
         results: [{ service: 'IMAP', success: false, message: 'No accounts are stored yet.' }],
      };
   }

   const results = await Promise.all(
      accounts.flatMap((account) => [
         testImapConnection(account),
         ...(account.smtpHost ? [testSmtpConnection(account)] : []),
      ]),
   );
   return { success: results.every((result) => result.success), results };
}


function formatAddress(address: EmailAddress): string {
   return address.name
      ? `${address.name.replace(/[<>"]/g, '')} <${address.address}>`
      : address.address;
}

function validateAddress(address: EmailAddress): void {
   if (!address || typeof address.address !== 'string' ||
       !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address.address)) {
      throw new Error('A valid email address is required');
   }
}

function decodeMimeBody(source: string): { text?: string; html?: string } {
   const headerEnd = source.search(/\r?\n\r?\n/);
   if (headerEnd < 0) return { text: source.trim() };

   const headers = source.slice(0, headerEnd);
   const body = source.slice(headerEnd).replace(/^\r?\n\r?\n/, '');
   const contentType = headers.match(/^content-type:\s*([^;\r\n]+)/im)?.[1]?.toLowerCase() ?? 'text/plain';
   const transferEncoding = headers.match(/^content-transfer-encoding:\s*([^\r\n]+)/im)?.[1]?.trim().toLowerCase();

   const decode = (value: string): string => {
      if (transferEncoding === 'base64') {
         try { return Buffer.from(value.replace(/\s/g, ''), 'base64').toString('utf8'); }
         catch { return value; }
      }
      if (transferEncoding === 'quoted-printable') {
         return value.replace(/=\r?\n/g, '').replace(/=([0-9a-f]{2})/gi, (_match, hex) =>
            String.fromCharCode(parseInt(hex, 16)));
      }
      return value;
   };

   const boundary = headers.match(/boundary="?([^";]+)"?/i)?.[1];
   if (contentType.startsWith('multipart/') && boundary) {
      const parts = body.split(`--${boundary}`).filter((part) => part.trim() && !part.trim().startsWith('--'));
      let text: string | undefined;
      let html: string | undefined;
      for (const part of parts) {
         const decoded = decodeMimeBody(part.trim());
         text ??= decoded.text;
         html ??= decoded.html;
      }
      return { text, html };
   }

   const decoded = decode(body).trim();
   if (contentType === 'text/html') return { html: decoded };
   if (contentType === 'text/plain') return { text: decoded };
   return {};
}

function parseRawMessage(source: Buffer, fallbackSubject: string) {
   const raw = source.toString('utf8');
   const headerEnd = raw.search(/\r?\n\r?\n/);
   const headers = headerEnd >= 0 ? raw.slice(0, headerEnd) : '';
   const unfolded = headers.replace(/\r?\n[ \t]+/g, ' ');
   const getHeader = (name: string) =>
      unfolded.match(new RegExp(`^${name}:\\s*(.*)$`, 'im'))?.[1]?.trim();

   const decodeHeader = (value: string | undefined) => {
      if (!value) return '';
      return value.replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi, (_m, _charset, encoding, data) => {
         try {
            return encoding.toLowerCase() === 'b'
               ? Buffer.from(data, 'base64').toString('utf8')
               : data.replace(/_/g, ' ').replace(/=([0-9a-f]{2})/gi, (_x: string, hex: string) =>
                    String.fromCharCode(parseInt(hex, 16)));
         } catch { return data; }
      });
   };

   const parseAddresses = (value: string | undefined): EmailAddress[] => {
      if (!value) return [];
      return value.split(/,(?![^<]*>)/).map((item) => {
         const match = item.trim().match(/^(.*?)\s*<([^<>]+)>$/);
         return match
            ? { name: decodeHeader(match[1].replace(/^"|"$/g, '')), address: match[2].trim() }
            : { address: item.trim().replace(/^mailto:/i, '') };
      }).filter((item) => item.address.includes('@'));
   };

   const body = headerEnd >= 0 ? raw.slice(headerEnd) : raw;
   const content = decodeMimeBody(`${headers}\r\n\r\n${body}`);
   const from = parseAddresses(getHeader('from'));
   const to = parseAddresses(getHeader('to'));
   const cc = parseAddresses(getHeader('cc'));
   const bcc = parseAddresses(getHeader('bcc'));
   const replyTo = parseAddresses(getHeader('reply-to'));
   const messageId = getHeader('message-id');
   const references = (getHeader('references') ?? '').match(/<[^>]+>/g) ?? [];

   return {
      id: messageId || `imap-${Date.now()}`,
      messageId,
      from,
      to,
      cc,
      bcc,
      replyTo,
      subject: decodeHeader(getHeader('subject')) || fallbackSubject || '(No subject)',
      text: content.text,
      html: content.html,
      date: getHeader('date') ? new Date(getHeader('date')!) : undefined,
      inReplyTo: getHeader('in-reply-to'),
      references,
   };
}

/**
 * Sends an email using the configured SMTP account.
 * SMTP credentials are read only in the Electron main process.
 */
export async function sendEmail(request: SendEmailRequest): Promise<SendEmailResult> {
   if (!request || !Array.isArray(request.to) || request.to.length === 0 ||
       (request.cc !== undefined && !Array.isArray(request.cc)) ||
       (request.bcc !== undefined && !Array.isArray(request.bcc))) {
      throw new Error('At least one valid recipient is required');
   }
   [...request.to, ...(request.cc ?? []), ...(request.bcc ?? [])].forEach(validateAddress);
   if (typeof request.subject !== 'string' || typeof request.text !== 'string') {
      throw new Error('A subject and plain-text message body are required');
   }
   if (!request.text.trim() && !request.html?.trim()) {
      throw new Error('The email message cannot be empty');
   }

   const host = requiredEnv('SMTP_HOST');
   const port = requiredPort('SMTP_PORT', 587);
   const user = requiredEnv('SMTP_USER');
   const password = requiredEnv('SMTP_PASSWORD');
   const from = env.SMTP_FROM?.trim() || user;

   const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user, pass: password },
      tls: { rejectUnauthorized: true },
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      greetingTimeout: CONNECTION_TIMEOUT_MS,
      socketTimeout: CONNECTION_TIMEOUT_MS,
   });

   try {
      const result = await transporter.sendMail({
         from,
         to: request.to.map(formatAddress),
         cc: request.cc?.map(formatAddress),
         bcc: request.bcc?.map(formatAddress),
         subject: request.subject,
         text: request.text,
         html: request.html,
      });
      return {
         accepted: result.accepted.map((recipient) => String(recipient)),
         messageId: result.messageId,
      };
   } finally {
      transporter.close();
   }
}

/**
 * Fetches the newest messages from an IMAP mailbox. The UID is used as the
 * message identifier within the mailbox; credentials never leave this process.
 */
export async function fetchEmails(request: FetchEmailsRequest = {}): Promise<FetchedEmail[]> {
   const mailbox = request.mailbox?.trim() || env.IMAP_MAILBOX?.trim() || 'INBOX';
   const requestedLimit = Number(request.limit ?? 50);
   const limit = Number.isFinite(requestedLimit)
      ? Math.min(200, Math.max(1, Math.floor(requestedLimit)))
      : 50;
   const client = new ImapFlow({
      host: requiredEnv('IMAP_HOST'),
      port: requiredPort('IMAP_PORT', 993),
      secure: true,
      auth: {
         user: requiredEnv('IMAP_USER'),
         pass: requiredEnv('IMAP_PASSWORD'),
      },
      tls: { rejectUnauthorized: true },
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      greetingTimeout: CONNECTION_TIMEOUT_MS,
      socketTimeout: CONNECTION_TIMEOUT_MS,
      logger: false,
   });

   let connected = false;
   let lock: { release: () => void } | undefined;
   try {
      await client.connect();
      connected = true;
      lock = await client.getMailboxLock(mailbox);
      const mailboxInfo = client.mailbox;
      const uidValidity = Number(
         mailboxInfo && typeof mailboxInfo === 'object'
            ? mailboxInfo.uidValidity ?? 0
            : 0
      );
      const uids = await client.search({ all: true }, { uid: true });
      if (!uids || uids.length === 0) return [];

      const newestUids = uids.slice(-limit).reverse();
      const messages: FetchedEmail[] = [];
      for await (const message of client.fetch(newestUids, {
         uid: true,
         envelope: true,
         source: true,
         flags: true,
         internalDate: true,
         size: true,
      }, { uid: true })) {
         const parsed = message.source
            ? parseRawMessage(message.source, message.envelope?.subject ?? '')
            : {
                 id: message.envelope?.messageId ?? `imap-${message.uid}`,
                 messageId: message.envelope?.messageId ?? undefined,
                 from: (message.envelope?.from ?? []).map((a) => ({ name: a.name ?? undefined, address: a.address ?? '' })),
                 to: (message.envelope?.to ?? []).map((a) => ({ name: a.name ?? undefined, address: a.address ?? '' })),
                 cc: [], bcc: [], replyTo: [], subject: message.envelope?.subject ?? '(No subject)',
                 references: [],
              };

         messages.push({
            message: parsed,
            mailbox,
            uid: message.uid,
            uidValidity,
            flags: [...(message.flags ?? [])],
            internalDate: message.internalDate
               ? new Date(message.internalDate).toISOString()
               : undefined,
            size: message.size,
         });
      }
      return messages;
   } finally {
      lock?.release();
      if (connected) {
         try { await client.logout(); } catch { /* Preserve the fetch result/error. */ }
      }
   }
}
