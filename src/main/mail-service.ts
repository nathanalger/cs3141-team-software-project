import { env } from 'node:process';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import type { MailConnectionResult, MailConnectionStatus } from '../shared/email';

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
            // The connection test already has its result; logout errors are non-fatal here.
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
         // Port 465 uses implicit TLS. Other configured ports must successfully negotiate STARTTLS.
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
   return { success: results.every((result) => result.success), results };
}
