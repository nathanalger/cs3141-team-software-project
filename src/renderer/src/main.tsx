import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter';
import { router } from './router';
import { RouterProvider } from 'react-router-dom';
import ThemeColorProvider from './architecture/ThemeColorProvider';
import { SettingsProvider } from './settings/SettingsContext';

createRoot(document.getElementById('root')!).render(
   <StrictMode>
      <SettingsProvider>
         <ThemeColorProvider>
            <RouterProvider router={router} />
         </ThemeColorProvider>
      </SettingsProvider>
   </StrictMode>,
);
