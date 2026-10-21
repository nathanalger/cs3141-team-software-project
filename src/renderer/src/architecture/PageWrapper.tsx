import { Box } from '@mui/joy';
import type { SxProps } from '@mui/joy/styles/types';
import type { ReactNode } from 'react';

const PageWrapperSx = {} as SxProps;

const PageWrapper = ({ children }: { children?: ReactNode }) => {
   return <Box sx={PageWrapperSx}>{children}</Box>;
};

export default PageWrapper;
