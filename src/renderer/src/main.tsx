import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter';
import { router } from './router';
import { RouterProvider } from 'react-router-dom';
import Provider from './architecture/Provider';
import { SettingsProvider } from './settings/SettingsContext';

createRoot(document.getElementById('root')!).render(
   <StrictMode>
      <Provider>
         <SettingsProvider>
            <RouterProvider router={router} />
         </SettingsProvider>
      </Provider>
   </StrictMode>,
);
