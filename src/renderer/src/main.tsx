import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter';
import { router } from './router';
import { RouterProvider } from 'react-router-dom';
import Provider from './architecture/Provider';

createRoot(document.getElementById('root')!).render(
   <StrictMode>
      <Provider>
         <RouterProvider router={router} />
      </Provider>
   </StrictMode>,
);
