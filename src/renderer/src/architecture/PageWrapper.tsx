import { Box } from '@mui/joy';
import type { SxProps } from '@mui/joy/styles/types';
import type { ReactNode } from 'react';

const PageWrapperSx = {
   gap: 2,
   display: 'flex',
   flexDirection: 'column',
} as SxProps;

const PageWrapper = ({ children, sx }: { children?: ReactNode; sx?: SxProps }) => {
   return <Box sx={[PageWrapperSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>{children}</Box>;
};

export default PageWrapper;
