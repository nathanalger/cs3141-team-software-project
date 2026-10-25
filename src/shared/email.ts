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
