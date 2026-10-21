import { Box, IconButton, useColorScheme } from '@mui/joy';
import Close from '@mui/icons-material/Close';
import CropSquare from '@mui/icons-material/CropSquare';
import FilterNone from '@mui/icons-material/FilterNone';
import Minimize from '@mui/icons-material/Minimize';
import type { SxProps } from '@mui/joy/styles/types';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';

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
   const [isMaximized, setIsMaximized] = useState(false);

   useEffect(() => {
      const desktop = window.desktop;
      if (!desktop) return;

      void desktop.isMaximized().then(setIsMaximized);
      return desktop.onMaximizeChange(setIsMaximized);
   }, []);

   return (
      <Box
         sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
         }}
      >
         {/* Top Nav Bar, could theoretically be top bar */}
         <Box
            sx={{
               bgcolor: (t) => t.palette.background.surface,
               display: 'flex',
               height: NAV_THICKNESS,
               WebkitAppRegion: 'drag',
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
                  src="/top-left-logo.png"
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
               <NavBar />
            </Box>
            <Box
               sx={{
                  display: 'flex',
                  alignItems: 'center',
                  WebkitAppRegion: 'no-drag',
                  gap: 1,
                  mr: 2,
               }}
            >
               <IconButton
                  size="sm"
                  aria-label="Minimize window"
                  variant="plain"
                  onClick={() => void window.desktop?.minimize()}
               >
                  <Minimize />
               </IconButton>
               <IconButton
                  size="sm"
                  aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
                  variant="plain"
                  onClick={() => {
                     void window.desktop?.toggleMaximize().then(setIsMaximized);
                  }}
               >
                  {isMaximized ? <FilterNone /> : <CropSquare />}
               </IconButton>
               <IconButton
                  size="sm"
                  aria-label="Close window"
                  variant="plain"
                  onClick={() => void window.desktop?.close()}
               >
                  <Close />
               </IconButton>
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
