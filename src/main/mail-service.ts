import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail } from 'mailparser';
import type {
   AccountCredentials,
   FetchEmailsRequest,
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
