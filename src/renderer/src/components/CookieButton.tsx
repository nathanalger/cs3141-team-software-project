import { Box, Button, type ButtonPropsColorOverrides } from '@mui/joy';
import type { ColorPaletteProp, SxProps } from '@mui/joy/styles/types';
import type { MouseEventHandler, ReactNode } from 'react';

const CookieButtonSx = {
   bgcolor: 'transparent',
   borderRadius: 9999,
   height: 30,
   px: 1.5,
} as SxProps;

const CookieButton = ({
   children,
   sx,
   icon,
   color,
   onClick,
}: {
   children?: ReactNode;
   sx?: SxProps;
   icon?: ReactNode;
   color?: ColorPaletteProp & ButtonPropsColorOverrides;
   onClick?: MouseEventHandler<HTMLButtonElement>;
}) => {
   return (
      <Button
         startDecorator={icon}
         variant="outlined"
         onClick={onClick}
         color={color}
         sx={{
            ...CookieButtonSx,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(sx as any),
         }}
      >
         <Box
            sx={{
               px: 0.5,
            }}
         >
            {children}
         </Box>
      </Button>
   );
};

export default CookieButton;
