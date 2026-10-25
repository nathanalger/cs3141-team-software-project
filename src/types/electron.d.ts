export {};
import type { SettingValue, SettingsValues } from './settings';
import type { MailConnectionResult } from '../shared/email';

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
         onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
      };
   }
}
