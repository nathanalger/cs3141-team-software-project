import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail } from 'mailparser';
import type {
   AccountCredentials,
   EmailAddress,
   FetchEmailsRequest,
   MailConnectionResult,
   MailConnectionStatus,
   MailboxInfo,
   SendEmailRequest,
   SendEmailResult,
} from '../shared/email';
import type { EmailMessage, StoredEmail } from '../types/email';
import { AccountDao } from './dao/AccountDao';
import { EmailDao } from './dao/EmailDao';
import { EmailFolderDao, type EmailFolderRow } from './dao/EmailFolderDao';
import { readEml, removeEml, removeFolderDir, writeEml } from './email-filesystem';


const CONNECTION_TIMEOUT_MS = 10_000;

function errorMessage(error: unknown): string {
   if (error instanceof Error) return error.message;
   return 'An unknown connection error occurred';
}

function createImapClient(account: AccountCredentials): ImapFlow {
   const client = new ImapFlow({
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
   client.on('error', (error) => {
      console.error('[mail] IMAP connection error:', error);
   });
   return client;
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
      if (client) {
         try {
            if (connected) {
               await client.logout();
            }
         } catch {
            // Logout errors do not change the result of the completed connection test.
         } finally {
            client.close();
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

export async function listMailboxes(accountID?: number): Promise<MailboxInfo[]> {
   const account = new AccountDao().getForMailOperations(accountID);
   if (!account.imapPassword) throw new Error(`No IMAP password is stored for ${account.email}.`);

   const client = createImapClient(account);
   let connected = false;
   try {
      await client.connect();
      connected = true;
      const mailboxes = await client.list();
      return mailboxes.map((mailbox) => ({
         path: mailbox.path,
         name: mailbox.name,
         delimiter: typeof mailbox.delimiter === 'string' ? mailbox.delimiter : '/',
         ...(mailbox.specialUse ? { specialUse: mailbox.specialUse } : {}),
         flags: [...mailbox.flags],
      }));
   } finally {
      try {
         if (connected) await client.logout();
      } finally {
         client.close();
      }
   }
}

export async function fetchEmails(request: FetchEmailsRequest = {}): Promise<StoredEmail[]> {
   const account = new AccountDao().getForMailOperations(request.accountID);
   if (!account.imapPassword) throw new Error(`No IMAP password is stored for ${account.email}.`);

   const mailbox = request.mailbox?.trim() || 'INBOX';
   const limit = request.limit ?? 50;
   if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      throw new Error('The email limit must be a whole number between 1 and 200.');
   }
   const beforeUID = request.beforeUID;
   if (beforeUID !== undefined && (!Number.isInteger(beforeUID) || beforeUID < 1)) {
      throw new Error('beforeUID must be a positive whole number.');
   }

   // Sets up the Email folders and begins assigning UUIDs
   const folderDao = new EmailFolderDao();
   const emailDao = new EmailDao();
   let folder: EmailFolderRow;
   let uidValidity: number;

   const client = createImapClient(account);
   let connected = false;
   try {
      await client.connect();
      connected = true;
      const lock = await client.getMailboxLock(mailbox, { readOnly: true });
      try {
         const state = client.mailbox;
         if (!state) throw new Error(`The ${mailbox} mailbox could not be opened.`);

         // folder row and UIDVALIDITY check for all of the emails
         folder = folderDao.getOrCreate(account.accountID, mailbox, state.delimiter || '/');
         uidValidity = Number(state.uidValidity);
         if (folder.uidValidity !== uidValidity) {
            if (folder.uidValidity !== null) await removeFolderDir(folder.pathOnDisk);
            folderDao.resetForUidValidity(folder.folderID, uidValidity);
         }

         // UID + flags for the whole folder, no bodies. Works on any IMAP server (no CONDSTORE/QRESYNC needed).
         const serverFlags = new Map<number, Set<string>>();
         if (state.exists > 0) {
            for (const item of await client.fetchAll('1:*', { uid: true, flags: true })) {
               serverFlags.set(item.uid, item.flags ?? new Set<string>());
            }
         }

         // only the newest page reconciles deletes/moves-out and flag changes
         if (!beforeUID) {
            const removedFiles = emailDao.syncFolderState(folder.folderID, serverFlags);
            await Promise.all(removedFiles.map((fileName) => removeEml(folder.pathOnDisk, fileName)));
         }

         // the `limit` newest UIDs below the cursor
         const uids = [...serverFlags.keys()]
            .filter((uid) => !beforeUID || uid < beforeUID)
            .sort((a, b) => a - b)
            .slice(-limit);

         if (uids.length) {
            // download only bodies that aren't saved yet
            const stored = emailDao.storedUids(folder.folderID, uids[0]);
            const missing = uids.filter((uid) => !stored.has(uid));

            if (missing.length) {
               const fetched = await client.fetchAll(
                  missing.join(','),
                  { uid: true, flags: true, size: true, source: true },
                  { uid: true },
               );

               // then use the filesystem fucntions to write the file, then the row
               for (const item of fetched) {
                  if (!item.source) continue;
                  const fileName = await writeEml(folder.pathOnDisk, item.uid, item.source);
                  const parsed = await simpleParser(item.source);
                  emailDao.insert({
                     folderID: folder.folderID,
                     uid: item.uid,
                     fileName,
                     message: toEmailMessage(parsed, item.uid),
                     flags: item.flags ?? new Set<string>(),
                     ...(item.size !== undefined ? { size: item.size } : {}),
                     ...(parsed.text ? { snippet: parsed.text.slice(0, 200) } : {}),
                     hasAttach: parsed.attachments.length > 0,
                  });
               }
            }
            if (!beforeUID) folderDao.markSynced(folder.folderID, uids[uids.length - 1]);
         }
      } finally {
         lock.release();
      }
   } finally {
      try {
         if (connected) await client.logout();
      } finally {
         client.close();
      }
   }

   // return the saved copies
   const rows = emailDao.listByFolder(folder.folderID, limit, beforeUID);
   return Promise.all(rows.map(async (row): Promise<StoredEmail> => {
      const parsed = await simpleParser(await readEml(folder.pathOnDisk, row.fileName));
      const flags = new Set<string>();
      if (row.isRead) flags.add('\\Seen');
      if (row.isFlagged) flags.add('\\Flagged');
      if (row.isAnswered) flags.add('\\Answered');
      return {
         message: toEmailMessage(parsed, row.uid),
         mailbox,
         uid: row.uid,
         uidValidity,
         flags,
         ...(row.size !== null ? { size: row.size } : {}),
      };
   }));
}


export async function sendEmail(request: SendEmailRequest): Promise<SendEmailResult> {
   if (!request || !Array.isArray(request.to) || request.to.length === 0 ||
      (request.cc !== undefined && !Array.isArray(request.cc)) ||
      (request.bcc !== undefined && !Array.isArray(request.bcc))) {
      throw new Error('At least one valid recipient is required.');
   }
   [...request.to, ...(request.cc ?? []), ...(request.bcc ?? [])].forEach((recipient) => {
      if (!recipient || typeof recipient.address !== 'string' ||
         !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient.address)) {
         throw new Error('A valid email address is required.');
      }
   });
   if (typeof request.subject !== 'string' || typeof request.text !== 'string') {
      throw new Error('A subject and plain-text message body are required.');
   }
   if (!request.text.trim() && !request.html?.trim()) {
      throw new Error('The email message cannot be empty.');
   }

   const account = new AccountDao().getForMailOperations(request.accountID);
   if (!account.smtpHost) throw new Error(`No SMTP server is configured for ${account.email}.`);
   if (account.smtpUser && !account.smtpPassword) {
      throw new Error(`No SMTP password is stored for ${account.email}.`);
   }

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
