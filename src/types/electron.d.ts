export {};
import type { SettingValue, SettingsValues } from './settings';
import type {
   Account,
   AccountInput,
   AccountUpdateInput,
   FetchEmailsRequest,
   MailConnectionResult,
   SendEmailRequest,
   SendEmailResult,
} from '../shared/email';
import type { StoredEmail } from './email';

declare global {
   interface Window {
      desktop: {
         platform: NodeJS.Platform;
         minimize: () => Promise<void>;
         toggleMaximize: () => Promise<boolean>;
         close: () => Promise<void>;
         isMaximized: () => Promise<boolean>;
         getSettings: () => Promise<SettingsValues>;
         setSetting: (key: string, value: SettingValue) => Promise<SettingsValues>;
         testMailConnections?: () => Promise<MailConnectionResult>;
         sendEmail: (request: SendEmailRequest) => Promise<SendEmailResult>;
         fetchEmails: (request?: FetchEmailsRequest) => Promise<FetchedEmail[]>;
         testMailConnections: () => Promise<MailConnectionResult>;
         fetchEmails: (request: FetchEmailsRequest) => Promise<StoredEmail[]>;
         sendEmail: (request: SendEmailRequest) => Promise<SendEmailResult>;
         getAccounts: () => Promise<Account[]>;
         createAccount: (account: AccountInput) => Promise<Account>;
         updateAccount: (account: AccountUpdateInput) => Promise<Account>;
         deleteAccount: (accountID: number) => Promise<void>;
         onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
      };
   }
}
