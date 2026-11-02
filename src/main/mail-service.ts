import { env } from 'node:process';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import type {
   EmailAddress,
   FetchEmailsRequest,
   FetchedEmail,
   MailConnectionResult,
   MailConnectionStatus,
   SendEmailRequest,
   SendEmailResult,
} from '../shared/email';

const CONNECTION_TIMEOUT_MS = 10_000;

function requiredEnv(name: string): string {
   const value = env[name]?.trim();
   if (!value) throw new Error(`Missing environment variable ${name}`);
   return value;
}

function requiredPort(name: string, fallback: number): number {
   const rawValue = env[name]?.trim();
   const value = rawValue ? Number(rawValue) : fallback;
   if (!Number.isInteger(value) || value < 1 || value > 65535) {
      throw new Error(`${name} must be a valid TCP port (1–65535)`);
   }
   return value;
}

function errorMessage(error: unknown): string {
   if (error instanceof Error) return error.message;
   return 'An unknown connection error occurred';
}

async function testImapConnection(): Promise<MailConnectionStatus> {
   let client: ImapFlow | undefined;
   let connected = false;

   try {
      client = new ImapFlow({
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

      await client.connect();
      connected = true;
      const mailboxes = await client.list();
      return {
         service: 'IMAP',
         success: true,
         message: `TLS connection and authentication succeeded (${mailboxes.length} mailbox${mailboxes.length === 1 ? '' : 'es'} found).`,
      };
   } catch (error) {
      return { service: 'IMAP', success: false, message: errorMessage(error) };
   } finally {
      if (client && connected) {
         try {
            await client.logout();
         } catch {
         }
      }
   }
}

async function testSmtpConnection(): Promise<MailConnectionStatus> {
   try {
      const host = requiredEnv('SMTP_HOST');
      const port = requiredPort('SMTP_PORT', 587);
      const transporter = nodemailer.createTransport({
         host,
         port,
         secure: port === 465,
         requireTLS: port !== 465,
         auth: {
            user: requiredEnv('SMTP_USER'),
            pass: requiredEnv('SMTP_PASSWORD'),
         },
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
         success: true,
         message: `TLS connection and authentication succeeded on port ${port}.`,
      };
   } catch (error) {
      return { service: 'SMTP', success: false, message: errorMessage(error) };
   }
}

/** Tests secure connections only; it does not send email or expose credentials to the renderer. */
export async function testMailConnections(): Promise<MailConnectionResult> {
   const results = await Promise.all([testImapConnection(), testSmtpConnection()]);
   return { success: results.every((result: any) => result.success), results };
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
