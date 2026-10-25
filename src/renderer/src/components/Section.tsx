import { Box } from '@mui/joy';
import type { SxProps } from '@mui/joy/styles/types';
import type { ReactNode } from 'react';

/**
 * This is intended to be a card replacement
 */
const Section = ({ children, sx, id }: { children: ReactNode; sx?: SxProps; id?: string }) => {
   return (
      <Box
         id={id}
         sx={{
            p: 2,
            border: (t) => `1px solid ${t.palette.neutral[700]}`,
            bgcolor: (t) => t.palette.background.surface,
            overflow: 'hidden',
            borderRadius: 8,
            ...sx,
         }}
      >
         {children}
      </Box>
   );
};

export default Section;
