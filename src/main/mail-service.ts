import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import type { AccountCredentials, MailConnectionResult, MailConnectionStatus } from '../shared/email';
import { AccountDao } from './dao/AccountDao';

const CONNECTION_TIMEOUT_MS = 10_000;

function errorMessage(error: unknown): string {
   if (error instanceof Error) return error.message;
   return 'An unknown connection error occurred';
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
      client = new ImapFlow({
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
