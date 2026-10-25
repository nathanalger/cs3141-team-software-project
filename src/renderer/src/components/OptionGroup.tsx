import { Box } from '@mui/joy';
import type { SxProps } from '@mui/joy/styles/types';
import { Children, type ReactNode } from 'react';

const OptionGroup = ({ children, sx }: { children: ReactNode; sx?: SxProps }) => {
   const options = Children.toArray(children);

   return (
      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', borderRadius: 8, overflow: 'hidden', ...sx }}>
         {options.map((option, index) => (
            <Box
               key={index}
               sx={{
                  borderBottom: index === options.length - 1 ? 'none' : (theme) => `1px solid ${theme.palette.divider}`,
               }}
            >
               {option}
            </Box>
         ))}
      </Box>
   );
};

export default OptionGroup;
