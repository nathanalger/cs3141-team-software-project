import { Box } from '@mui/joy';
import type { SxProps } from '@mui/joy/styles/types';
import { Outlet } from 'react-router-dom';
import Provider from './Provider';

const MainWrapperSx = {
   p: 0,
   m: 0,
} as SxProps;

const MainWrapper = () => {
   return (
      <Provider>
         <Box sx={MainWrapperSx}>
            <Outlet />
         </Box>
      </Provider>
   );
};

export default MainWrapper;
