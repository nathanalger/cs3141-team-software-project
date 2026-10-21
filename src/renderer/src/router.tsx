import { createMemoryRouter } from 'react-router-dom';
import MainWrapper from './architecture/MainWrapper';
import InboxPage from './pages/InboxPage';
import SettingsPage from './pages/Settings';

export const router = createMemoryRouter([
   {
      path: '/',
      element: <MainWrapper />,
      children: [
         { index: true, element: <InboxPage /> },
         { path: '/settings', element: <SettingsPage /> },
      ],
   },
]);
