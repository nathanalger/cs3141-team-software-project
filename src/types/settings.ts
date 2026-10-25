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

export type SettingDefinition = TextSetting | ColorSetting | BooleanSetting | NumberSetting;

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
   icon: 'inbox' | 'palette' | 'person' | 'settings';
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
];

export type SettingsValues = Record<string, SettingValue>;

export const getSettingKey = (categoryName: string, subcategoryName: string, settingName: string) =>
   `${categoryName}.${subcategoryName}.${settingName}`;

export const getDefaultSettings = (): SettingsValues =>
   Object.fromEntries(
      SETTINGS_SCHEMA.flatMap((category) =>
         category.subcategories.flatMap((subcategory) =>
            subcategory.settings.map((setting) => [
               getSettingKey(category.name, subcategory.name, setting.name),
               setting.defaultValue,
            ]),
         ),
      ),
   );
