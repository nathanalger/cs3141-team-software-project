export type SettingValue = string | boolean | number;
export const DEFAULT_PRIMARY_COLOR = '#0B6BCB';
export const isValidHexColor = (value: unknown): value is string =>
   typeof value === 'string' && /^#[\da-fA-F]{6}$/.test(value);

interface BaseSetting {
   name: string;
   displayName: string;
   description: string;
}

export interface TextSetting extends BaseSetting {
   type: 'text';
   defaultValue: string;
   placeholder?: string;
}

export interface ColorSetting extends BaseSetting {
   type: 'color';
   defaultValue: string;
}

export interface BooleanSetting extends BaseSetting {
   type: 'boolean';
   defaultValue: boolean;
}

export interface NumberSetting extends BaseSetting {
   type: 'number';
   defaultValue: number;
   min?: number;
   max?: number;
   step?: number;
}

export interface DebugButtonSetting extends BaseSetting {
   type: 'debug-button';
   buttonLabel: string;
   action: () => unknown | Promise<unknown>;
}

export type PersistedSettingDefinition = TextSetting | ColorSetting | BooleanSetting | NumberSetting;
export type SettingDefinition = PersistedSettingDefinition | DebugButtonSetting;

export interface SettingsSubcategory {
   name: string;
   displayName: string;
   description: string;
   settings: SettingDefinition[];
}

export interface SettingsCategory {
   name: string;
   displayName: string;
   description: string;
   icon: 'inbox' | 'palette' | 'person' | 'settings' | 'debug';
   subcategories: SettingsSubcategory[];
}

export const SETTINGS_SCHEMA: SettingsCategory[] = [
   {
      name: 'inbox',
      displayName: 'Inbox',
      description: 'Customize how messages appear in your inbox.',
      icon: 'inbox',
      subcategories: [
         {
            name: 'message-list',
            displayName: 'Message list',
            description: 'Choose which details appear in the message list.',
            settings: [
               {
                  name: 'show-preview',
                  displayName: 'Show message previews',
                  description: 'Display a short preview of each message in the inbox.',
                  type: 'boolean',
                  defaultValue: true,
               },
               {
                  name: 'show-received-date',
                  displayName: 'Show received date',
                  description: 'Display when each message was received.',
                  type: 'boolean',
                  defaultValue: true,
               },
            ],
         },
      ],
   },
   {
      name: 'appearance',
      displayName: 'Appearance',
      description: 'Customize the look of the application.',
      icon: 'palette',
      subcategories: [
         {
            name: 'theme',
            displayName: 'Theme',
            description: 'Customize the application color theme.',
            settings: [
               {
                  name: 'primary-color',
                  displayName: 'Primary color',
                  description: 'Set the primary application color using a six-digit hex code.',
                  type: 'color',
                  defaultValue: DEFAULT_PRIMARY_COLOR,
               },
            ],
         },
      ],
   },
   {
      name: 'debug',
      displayName: 'Debug',
      description: 'Run diagnostic checks for development and troubleshooting.',
      icon: 'debug',
      subcategories: [
         {
            name: 'mail-connections',
            displayName: 'Mail connections',
            description: 'Check the configured mail server connections.',
            settings: [
               {
                  name: 'test-mail-connections',
                  displayName: 'Mail server connections',
                  description:
                     'Test authenticated TLS connections to the configured IMAP and SMTP test servers. This checks connectivity only; it does not send an email.',
                  type: 'debug-button',
                  buttonLabel: 'Test IMAP and SMTP connections',
                  action: async () => {
                     if (!window.desktop?.testMailConnections) {
                        throw new Error(
                           'The desktop connection-test API is unavailable. Restart the Electron app after installing the update.',
                        );
                     }

                     return window.desktop.testMailConnections();
                  },
               },
            ],
         },
      ],
   },
];

export type SettingsValues = Record<string, SettingValue>;

export const getSettingKey = (categoryName: string, subcategoryName: string, settingName: string) =>
   `${categoryName}.${subcategoryName}.${settingName}`;

export const getDefaultSettings = (): SettingsValues =>
   Object.fromEntries(
      SETTINGS_SCHEMA.flatMap((category) =>
         category.subcategories.flatMap((subcategory) =>
            subcategory.settings.flatMap((setting) =>
               setting.type === 'debug-button'
                  ? []
                  : [[getSettingKey(category.name, subcategory.name, setting.name), setting.defaultValue]],
            ),
         ),
      ),
   );
