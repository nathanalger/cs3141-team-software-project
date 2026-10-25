import { createContext, useContext } from 'react';
import type { SettingsContextValue } from '../settings/SettingsContext';

export const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const useSettings = () => {
   const context = useContext(SettingsContext);
   if (!context) throw new Error('useSettings must be used within SettingsProvider');
   return context;
};
