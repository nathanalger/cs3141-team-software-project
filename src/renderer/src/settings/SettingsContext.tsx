import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getDefaultSettings, type SettingValue, type SettingsValues } from '../../../types/settings';
import { SettingsContext } from '../hooks/useSettings';

export interface SettingsContextValue {
   values: SettingsValues;
   loading: boolean;
   error: string | undefined;
   setSetting: (key: string, value: SettingValue) => Promise<void>;
}

const getErrorMessage = (error: unknown) =>
   error instanceof Error ? error.message : 'An unexpected settings error occurred.';

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
   const [values, setValues] = useState<SettingsValues>(getDefaultSettings);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string>();

   useEffect(() => {
      let cancelled = false;

      window.desktop
         .getSettings()
         .then((storedValues) => {
            if (!cancelled) setValues({ ...getDefaultSettings(), ...storedValues });
         })
         .catch((loadError: unknown) => {
            if (!cancelled) setError(getErrorMessage(loadError));
         })
         .finally(() => {
            if (!cancelled) setLoading(false);
         });

      return () => {
         cancelled = true;
      };
   }, []);

   const setSetting = useCallback(async (key: string, value: SettingValue) => {
      try {
         await window.desktop.setSetting(key, value);
         setValues((previous) => ({ ...previous, [key]: value }));
         setError(undefined);
      } catch (saveError) {
         setError(getErrorMessage(saveError));
      }
   }, []);

   const contextValue = useMemo(() => ({ values, loading, error, setSetting }), [values, loading, error, setSetting]);

   return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
};
