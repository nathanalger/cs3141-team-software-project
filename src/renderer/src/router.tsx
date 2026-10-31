import { createMemoryRouter, Navigate, Outlet } from 'react-router-dom';
import MainWrapper from './architecture/MainWrapper';
import InboxPage from './pages/InboxPage';
import SettingsPage from './pages/Settings';
import AccountTestPage from './pages/AccountTestPage';

/**
 * When adding or changing pages, reflect changes in:
 *  - NavBar
 *  - FunctionBar
 *
 * This is important!
 * - Nathan
 */

export const router = createMemoryRouter([
   {
      path: '/',
      element: <MainWrapper />,
      children: [
         { index: true, element: <Navigate to="/settings" replace /> },
         { path: 'accounts', element: <AccountTestPage /> },
         {
            path: 'inbox',
            element: <Outlet />,
            children: [
               { index: true, element: <InboxPage /> },
               { path: 'contacts', element: <></> },
               { path: 'help', element: <></> },
            ],
         },
         {
            path: 'settings',
            element: <Outlet />,
            children: [
               { index: true, element: <SettingsPage /> },
               { path: ':category', element: <SettingsPage /> },
               { path: ':category/:subcategory', element: <SettingsPage /> },
            ],
         },
      ],
   },
]);
