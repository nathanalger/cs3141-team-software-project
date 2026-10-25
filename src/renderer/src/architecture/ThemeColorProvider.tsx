import { CssBaseline, CssVarsProvider, extendTheme } from '@mui/joy';
import { useMemo, type ReactNode } from 'react';
import { DEFAULT_PRIMARY_COLOR, getSettingKey, isValidHexColor } from '../../../types/settings';
import { useSettings } from '../hooks/useSettings';

/**
 * This looks really confusing but basically it splits the hex codes into its 3 main parts,
 * then adds channel + (target-channel) * amount, then places them back into a hex code and returns it as a string.
 * - Nathan
 */
const blendColor = (hex: string, target: number, amount: number) => {
   const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
   const blended = channels.map((channel) => Math.round(channel + (target - channel) * amount));
   return `#${blended.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
};

const createPrimaryPalette = (baseColor: string) => ({
   50: blendColor(baseColor, 255, 0.96),
   100: blendColor(baseColor, 255, 0.88),
   200: blendColor(baseColor, 255, 0.74),
   300: blendColor(baseColor, 255, 0.56),
   400: blendColor(baseColor, 255, 0.28),
   500: baseColor,
   600: blendColor(baseColor, 0, 0.12),
   700: blendColor(baseColor, 0, 0.24),
   800: blendColor(baseColor, 0, 0.38),
   900: blendColor(baseColor, 0, 0.52),
});

const ThemeColorProvider = ({ children }: { children: ReactNode }) => {
   const { values } = useSettings();
   const savedColor = values[getSettingKey('appearance', 'theme', 'primary-color')];
   const primaryColor = isValidHexColor(savedColor) ? savedColor.toUpperCase() : DEFAULT_PRIMARY_COLOR;
   const primaryPalette = useMemo(() => createPrimaryPalette(primaryColor), [primaryColor]);
   const theme = useMemo(
      () =>
         extendTheme({
            colorSchemes: {
               light: { palette: { primary: primaryPalette } },
               dark: { palette: { primary: primaryPalette } },
            },
         }),
      [primaryPalette],
   );

   return (
      <CssVarsProvider theme={theme} defaultMode="system">
         <CssBaseline />
         {children}
      </CssVarsProvider>
   );
};

export default ThemeColorProvider;
