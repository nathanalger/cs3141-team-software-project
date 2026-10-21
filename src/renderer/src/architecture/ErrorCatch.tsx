import { Box, Button, Typography } from '@mui/joy';
import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorCatchProps = {
   children: ReactNode;
};

type ErrorCatchState = {
   hasError: boolean;
};

class ErrorCatch extends Component<ErrorCatchProps, ErrorCatchState> {
   state: ErrorCatchState = { hasError: false };

   static getDerivedStateFromError(): ErrorCatchState {
      return { hasError: true };
   }

   componentDidCatch(error: Error, info: ErrorInfo) {
      console.error('[renderer] Uncaught page error:', error, info.componentStack);
   }

   render() {
      if (this.state.hasError) {
         return (
            <Box
               role="alert"
               sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  height: '100%',
                  textAlign: 'center',
               }}
            >
               <Typography level="h2">Something went wrong</Typography>
               <Typography>This page encountered an unexpected error.</Typography>
               <Button onClick={() => window.location.reload()}>Refresh</Button>
            </Box>
         );
      }

      return this.props.children;
   }
}

export default ErrorCatch;
