export interface EmailAddress {
   address: string;
   name?: string;
}

export type MailSecurity = 'tls' | 'starttls' | 'none';

export interface UserAccount {
   accountID: number;
   fName: string;
   lName: string;
   displayName?: string;
   email: string;
   imapHost: string;
   imapPort: number;
   imapSecurity: MailSecurity;
   imapUser?: string;
   smtpHost: string;
   smtpPort: number;
   smtpSecurity: MailSecurity;
   smtpUser?: string;
   isDefault: boolean;
   createdAt?: string;
}

export interface MailConnectionStatus {
   service: 'IMAP' | 'SMTP';
   success: boolean;
   message: string;
}

export interface MailConnectionResult {
   success: boolean;
   results: MailConnectionStatus[];
}

export interface Email {
   id: string;
   accountId: number;
   folderId?: number;
   uid?: number;
   messageId?: string;
   subject: string;
   from: EmailAddress;
   to: EmailAddress[];
   sentAt: string;
   snippet: string;
   body?: string;
   size?: number;
   hasAttachments: boolean;
   isRead: boolean;
   isFlagged: boolean;
}

export interface EmailMessage {
   id: string;
   messageId?: string;
   from: EmailAddress[];
   to: EmailAddress[];
   cc: EmailAddress[];
   bcc: EmailAddress[];
   replyTo: EmailAddress[];
   subject: string;
   text?: string;
   html?: string;
   date?: Date;
   inReplyTo?: string;
   references: string[];
}

export interface StoredEmail {
   message: EmailMessage;
   mailbox: string;
   uid: number;
   uidValidity: number;
   flags: Set<string>;
   internalDate?: Date;
   size?: number;
}

export interface OutgoingEmail {
   message: EmailMessage;
   envelope?: {
      from: string;
      to: string[];
   };
}

/**
 * This generates a list of messages for testing.
 * - Nathan
 */
export function generateSampleEmails(count = 10): StoredEmail[] {
   const contacts: EmailAddress[] = [
      { name: 'Alice Johnson', address: 'alice@example.com' },
      { name: 'Bob Smith', address: 'bob@example.com' },
      { name: 'Charlie Brown', address: 'charlie@example.com' },
      { name: 'Diana Wilson', address: 'diana@example.com' },
      { name: 'Evan Davis', address: 'evan@example.com' },
   ];

   const samples = [
      {
         subject: 'Project update',
         text: "The project is coming along nicely. We're on track to finish by Friday.",
      },
      {
         subject: 'Meeting tomorrow',
         text: 'Hi! Just a reminder that we have our meeting tomorrow at 10 AM.',
      },
      {
         subject: 'Quick question',
         text: 'Hey, do you have a few minutes to discuss the latest changes?',
      },
      {
         subject: 'Weekend plans',
         text: 'Are you free this weekend? We should catch up!',
      },
      {
         subject: 'Invoice #1042',
         text: 'Please find the details for the latest invoice below. Let me know if you have any questions.',
      },
      {
         subject: 'Welcome aboard!',
         text: "Welcome to the team! We're excited to have you working with us.",
      },
      {
         subject: 'Design feedback',
         text: "I've reviewed the latest mockups. The new layout looks great!",
      },
      {
         subject: 'Important announcement',
         text: 'Please read the attached announcement regarding upcoming changes.',
      },
      {
         subject: 'Thanks!',
         text: 'Thanks for your help with this. I really appreciate it!',
      },
      {
         subject: 'Your weekly summary',
         text: "Here's your weekly summary of updates, tasks, and upcoming deadlines.",
      },
   ];

   const now = Date.now();

   return Array.from({ length: count }, (_, i): StoredEmail => {
      const sender = contacts[i % contacts.length];
      const sample = samples[i % samples.length];

      const date = new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000);

      const flags = new Set<string>();

      if (Math.random() > 0.4) flags.add('\\Seen');
      if (Math.random() > 0.85) flags.add('\\Flagged');
      if (Math.random() > 0.9) flags.add('\\Answered');

      const html = `<p>${sample.text}</p>`;

      return {
         message: {
            id: `sample-${i + 1}`,
            messageId: `<sample-${i + 1}@example.com>`,
            from: [sender],
            to: [
               {
                  name: 'You',
                  address: 'you@example.com',
               },
            ],
            cc: [],
            bcc: [],
            replyTo: [],
            subject: sample.subject,
            text: sample.text,
            html,
            date,
            references: [],
         },

         mailbox: 'INBOX',
         uid: i + 1,
         uidValidity: 123456789,
         flags,
         internalDate: date,
         size: sample.text.length,
      };
   });
}