import { createMemoryRouter } from 'react-router-dom';
import MainWrapper from './architecture/MainWrapper';
import EmailList from './pages/EmailList';

export const router = createMemoryRouter([
   {
      path: '/',
      element: <MainWrapper />,
      children: [{ index: true, element: <EmailList /> }],
   },
]);
