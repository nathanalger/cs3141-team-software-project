import { createMemoryRouter } from 'react-router-dom'
import MainWrapper from './architecture/MainWrapper'
import Home from './pages/Home'

export const router = createMemoryRouter([
   {
      path: '/',
      element: <MainWrapper />,
      children: [{ index: true, element: <Home /> }],
   },
])
