import { createContext, useContext } from 'react';
import { getDefaultSettings } from '../../../types/settings';
import type { SettingValue } from '../../../types/settings';
import type { SettingsContextValue } from '../settings/SettingsContext';

const defaultSettingsContext: SettingsContextValue = {
   values: getDefaultSettings(),
   loading: false,
   error: undefined,
   setSetting: async (_key: string, _value: SettingValue) => {},
};

export const SettingsContext = createContext<SettingsContextValue>(defaultSettingsContext);

export const useSettings = () => useContext(SettingsContext);
