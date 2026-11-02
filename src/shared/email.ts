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

export interface SendEmailRequest {
   to: EmailAddress[];
   cc?: EmailAddress[];
   bcc?: EmailAddress[];
   subject: string;
   text: string;
   html?: string;
}

export interface FetchEmailsRequest {
   mailbox?: string;
   limit?: number;
}

export interface ParsedEmailMessage {
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

export interface FetchedEmail {
   message: ParsedEmailMessage;
   mailbox: string;
   uid: number;
   uidValidity: number;
   flags: string[];
   internalDate?: string;
   size?: number;
}

export interface SendEmailResult {
   accepted: string[];
   messageId: string;
}
