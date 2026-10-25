import { app } from 'electron';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getSettingKey, SETTINGS_SCHEMA, type SettingValue, type SettingsValues } from '../types/settings';

function getSettingsPath() {
   return join(app.getPath('userData'), 'settings.json');
}

function isSettingValue(value: unknown): value is SettingValue {
   return (
      typeof value === 'string' ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value))
   );
}

function getSettingDefinition(key: string) {
   for (const category of SETTINGS_SCHEMA) {
      for (const subcategory of category.subcategories) {
         for (const setting of subcategory.settings) {
            if (getSettingKey(category.name, subcategory.name, setting.name) === key) return setting;
         }
      }
   }

   return undefined;
}

function isValidForSetting(key: string, value: unknown) {
   const setting = getSettingDefinition(key);
   if (!setting) return false;
   if (setting.type === 'boolean') return typeof value === 'boolean';
   if (setting.type === 'text') return typeof value === 'string';

   return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      (setting.min === undefined || value >= setting.min) &&
      (setting.max === undefined || value <= setting.max)
   );
}

export function readSettings(): SettingsValues {
   const settingsPath = getSettingsPath();

   try {
      const parsed: unknown = JSON.parse(readFileSync(settingsPath, 'utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
         throw new Error('Settings file must contain a JSON object');
      }

      const values: SettingsValues = {};
      for (const [key, value] of Object.entries(parsed)) {
         if (!isSettingValue(value)) {
            throw new Error(`Invalid value for setting "${key}"`);
         }
         if (getSettingDefinition(key) && !isValidForSetting(key, value)) {
            throw new Error(`Stored value does not match the definition for setting "${key}"`);
         }
         values[key] = value;
      }

      return values;
   } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
         return {};
      }

      console.error('[settings] Failed to read settings:', settingsPath, error);
      throw error;
   }
}

export function writeSetting(key: string, value: unknown): SettingsValues {
   if (!/^[a-zA-Z][\w-]*(\.[a-zA-Z][\w-]*){2}$/.test(key) || !getSettingDefinition(key)) {
      throw new Error('Invalid setting key');
   }
   if (!isSettingValue(value) || !isValidForSetting(key, value)) {
      throw new Error(`Invalid value for setting "${key}"`);
   }

   const settingsPath = getSettingsPath();
   const temporaryPath = `${settingsPath}.${process.pid}.tmp`;

   try {
      const settings = readSettings();
      settings[key] = value;
      writeFileSync(temporaryPath, JSON.stringify(settings, null, 2), 'utf8');
      renameSync(temporaryPath, settingsPath);
      return settings;
   } catch (error) {
      console.error('[settings] Failed to write settings:', settingsPath, error);
      throw error;
   }
}
