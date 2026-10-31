export {};
import type { SettingValue, SettingsValues } from './settings';
import type { Account, AccountInput, AccountUpdateInput, MailConnectionResult } from '../shared/email';

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
         testMailConnections: () => Promise<MailConnectionResult>;
         getAccounts: () => Promise<Account[]>;
         createAccount: (account: AccountInput) => Promise<Account>;
         updateAccount: (account: AccountUpdateInput) => Promise<Account>;
         deleteAccount: (accountID: number) => Promise<void>;
         onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
      };
   }
}
