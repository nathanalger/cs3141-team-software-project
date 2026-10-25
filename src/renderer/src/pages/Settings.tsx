import {Alert, Box, Button, Card, Divider, Typography,} from '@mui/joy';
import { useState } from 'react';
import type { MailConnectionResult } from '../../../shared/email';
import PageWrapper from '../architecture/PageWrapper';

const SettingsPage = () => {
   const [testing, setTesting] = useState(false);
   const [result, setResult] =
      useState<MailConnectionResult | null>(null);
   const [unexpectedError, setUnexpectedError] =
      useState<string | null>(null);

   const testConnections = async () => {
      setTesting(true);
      setResult(null);
      setUnexpectedError(null);

      try {
         if (!window.desktop?.testMailConnections) {
            throw new Error(
               'The desktop connection-test API is unavailable. Restart the Electron app after installing the update.',
            );
         }

         const connectionResult =
            await window.desktop.testMailConnections();

         setResult(connectionResult);
      } catch (error) {
         setUnexpectedError(
            error instanceof Error
               ? error.message
               : 'An unexpected error occurred.',
         );
      } finally {
         setTesting(false);
      }
   };

   return (
      <PageWrapper>
         <Box
            sx={{
               display: 'flex',
               flexDirection: 'column',
               gap: 2,
               maxWidth: 760,
            }}
         >
            <Typography level="h2">Settings</Typography>

            <Card variant="outlined" sx={{ gap: 1.5 }}>
               <Typography level="h3">
                  Mail server connections
               </Typography>

               <Typography level="body-md">
                  Test authenticated TLS connections to the configured
                  IMAP and SMTP test servers. This checks connectivity
                  only; it does not send an email.
               </Typography>

               <Typography
                  level="body-sm"
                  sx={{ color: 'text.secondary' }}
               >
                  Configure server hostnames and credentials through
                  the environment variables documented in
                  getting-started.md. Passwords are not entered into
                  or exposed by this page.
               </Typography>

               <Box>
                  <Button
                     onClick={() => void testConnections()}
                     loading={testing}
                     disabled={testing}
                  >
                     {testing
                        ? 'Testing connections…'
                        : 'Test IMAP and SMTP connections'}
                  </Button>
               </Box>

               {unexpectedError && (
                  <Alert color="danger" role="alert">
                     {unexpectedError}
                  </Alert>
               )}

               {result && (
                  <Box
                     sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                     }}
                  >
                     <Alert
                        color={result.success ? 'success' : 'warning'}
                     >
                        {result.success
                           ? 'Both mail server connections succeeded.'
                           : 'One or more mail server connections failed.'}
                     </Alert>

                     {result.results.map((item) => (
                        <Box
                           key={item.service}
                           sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 0.25,
                              p: 1.25,
                              borderRadius: 'sm',
                              bgcolor: 'background.level1',
                           }}
                        >
                           <Typography level="title-sm">
                              {item.service}:{' '}
                              {item.success
                                 ? 'Connected securely'
                                 : 'Connection failed'}
                           </Typography>

                           <Typography
                              level="body-sm"
                              sx={{ overflowWrap: 'anywhere' }}
                           >
                              {item.message}
                           </Typography>
                        </Box>
                     ))}
                  </Box>
               )}

               <Divider />

               <Typography
                  level="body-xs"
                  sx={{ color: 'text.tertiary' }}
               >
                  TLS certificate verification is enabled. IMAP uses
                  TLS on its configured port (default 993). SMTP uses
                  implicit TLS on port 465 or requires STARTTLS on
                  other configured ports (default 587).
               </Typography>
            </Card>
         </Box>
      </PageWrapper>
   );
};

export default SettingsPage;
