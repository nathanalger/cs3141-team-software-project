/**
 * Note, i just had ChatGPT generate some sample code, this is not
 * intended to be used. Just shows how to use both services in the
 * Electron main-process API layer.
 * - Nathan
 */

import { env } from 'node:process'
import nodemailer from 'nodemailer'
import { ImapFlow } from 'imapflow'

function requiredEnv(name: string): string {
   const value = env[name]
   if (!value) {
      throw new Error(`Missing required environment variable: ${name}`)
   }
   return value
}

export async function sendEmail(): Promise<void> {
   const transporter = nodemailer.createTransport({
      host: requiredEnv('SMTP_HOST'),
      port: Number(env.SMTP_PORT ?? '587'),
      secure: env.SMTP_SECURE === 'true',
      auth: {
         user: requiredEnv('SMTP_USER'),
         pass: requiredEnv('SMTP_PASSWORD'),
      },
   })

   const result = await transporter.sendMail({
      from: requiredEnv('SMTP_FROM'),
      to: requiredEnv('EMAIL_TO'),
      subject: 'Sample email from Electron',
      text: 'This message was sent with Nodemailer.',
   })

   console.log(`Email sent: ${result.messageId}`)
}

export async function listMailboxes(): Promise<void> {
   const client = new ImapFlow({
      host: requiredEnv('IMAP_HOST'),
      port: Number(env.IMAP_PORT ?? '993'),
      secure: env.IMAP_SECURE !== 'false',
      auth: {
         user: requiredEnv('IMAP_USER'),
         pass: requiredEnv('IMAP_PASSWORD'),
      },
   })

   await client.connect()
   try {
      for (const mailbox of await client.list()) {
         console.log(mailbox.path)
      }
   } finally {
      await client.logout()
   }
}
