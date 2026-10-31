export interface EmailAddress {
   address: string;
   name?: string;
}

export type MailSecurity = 'tls' | 'starttls' | 'none';

export interface Account {
   accountID: number;
   fName: string;
   lName: string;
   displayName?: string;
   email: string;
   imapHost: string;
   imapPort: number;
   imapSecurity: MailSecurity;
   imapUser?: string;
   smtpHost?: string;
   smtpPort: number;
   smtpSecurity: MailSecurity;
   smtpUser?: string;
   isDefault: boolean;
   createdAt?: string;
}

export interface AccountInput {
   fName: string;
   lName: string;
   displayName?: string;
   email: string;
   imapHost: string;
   imapPort: number;
   imapSecurity: MailSecurity;
   imapUser: string;
   imapPassword: string;
   smtpHost?: string;
   smtpPort?: number;
   smtpSecurity?: MailSecurity;
   smtpUser?: string;
   smtpPassword?: string;
   isDefault?: boolean;
}

export interface AccountUpdateInput extends Omit<AccountInput, 'imapPassword'> {
   accountID: number;
   imapPassword?: string;
}

export interface AccountCredentials extends Account {
   imapPassword: string;
   smtpPassword?: string;
}

export interface MailConnectionStatus {
   service: 'IMAP' | 'SMTP';
   success: boolean;
   message: string;
   accountEmail?: string;
}

export interface MailConnectionResult {
   success: boolean;
   results: MailConnectionStatus[];
}

/** @deprecated Use Account instead. */
export type UserAccount = Account;

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