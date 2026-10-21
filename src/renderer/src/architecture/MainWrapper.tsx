import { Box, Typography, useColorScheme } from '@mui/joy';
import type { SxProps } from '@mui/joy/styles/types';
import { Outlet } from 'react-router-dom';

const NAV_THICKNESS = 60;

const MainWrapperSx = {
   p: 2,
   m: 0,
   flex: 1,
   height: '100%',
   bgcolor: (t) => t.palette.background.body,
   borderLeft: (t) => `2px solid ${t.palette.divider}`,
   borderTop: (t) => `2px solid ${t.palette.divider}`,
   boxSizing: 'border-box',
   borderRadius: 8,
   overflow: 'hidden',
} as SxProps;

const MainWrapper = () => {
   const { mode, systemMode } = useColorScheme();
   const currentMode = mode === 'system' ? systemMode : mode;

   return (
      <Box
         sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
         }}
      >
         {/* Top Nav Bar */}
         <Box
            sx={{
               bgcolor: (t) => t.palette.background.surface,
               display: 'flex',
               height: NAV_THICKNESS,
            }}
         >
            {/* Top Left Logo (TEMP) */}
            <Box
               sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  width: NAV_THICKNESS,
               }}
            >
               <Box
                  component="img"
                  src="/image.png"
                  alt="Application logo"
                  sx={{
                     display: 'block',
                     draggable: 'false',
                     height: NAV_THICKNESS - 32,
                     width: NAV_THICKNESS - 32,
                     m: 1,

                     aspectRatio: 1,
                     WebkitUserDrag: 'none',
                     userDrag: 'none',

                     WebkitUserSelect: 'none' /* Safari */,
                     MozUserSelect: 'none' /* Firefox */,
                     msUserSelect: 'none' /* IE/Edge */,
                     userSelect: 'none' /* Standard */,
                     ...(currentMode == 'dark'
                        ? {
                             filter: 'invert(100%)',
                          }
                        : {}),
                  }}
               />
            </Box>

            {/* Nav Bar */}
            <Box
               sx={{
                  flex: 1,
               }}
            >
               <Typography>ajhsd</Typography>
            </Box>
         </Box>
         <Box
            sx={{
               bgcolor: (t) => t.palette.background.surface,
               display: 'flex',
               flexDirection: 'row',
               height: '100%',
            }}
         >
            <Box
               sx={{
                  width: NAV_THICKNESS,
               }}
            ></Box>
            <Box sx={MainWrapperSx}>
               <Outlet />
            </Box>
         </Box>
      </Box>
   );
};

export default MainWrapper;
