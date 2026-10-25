import { ChevronRight } from '@mui/icons-material';
import { Box } from '@mui/joy';
import type { SxProps } from '@mui/joy/styles/types';
import type { ReactNode } from 'react';

const OptionSelection = ({ children, onClick, sx }: { children?: ReactNode; onClick?: () => void; sx?: SxProps }) => {
   return (
      <Box
         sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            px: 2,
            py: 1,
            '&:hover': {
               bgcolor: (t) => t.palette.background.popup,
            },
            ...sx,
         }}
         onClick={onClick}
      >
         <Box
            sx={{
               display: 'flex',
               flexGrow: 1,
            }}
         >
            {children}
         </Box>
         <Box
            sx={{
               display: 'flex',
               alignItems: 'center',
               flexShrink: 0,
            }}
         >
            <ChevronRight />
         </Box>
      </Box>
   );
};

export default OptionSelection;
