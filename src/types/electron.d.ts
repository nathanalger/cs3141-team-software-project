export {};
import type { SettingValue, SettingsValues } from './settings';

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
         onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
      };
   }
}
