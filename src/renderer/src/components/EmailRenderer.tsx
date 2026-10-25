import { Box, Button, Divider, Typography, useColorScheme } from '@mui/joy';
import interRegular from '@fontsource/inter/files/inter-latin-400-normal.woff2?inline';
import type { StoredEmail } from '../../../types/email';
import { ArrowBack } from '@mui/icons-material';

const formatAddresses = (addresses: StoredEmail['message']['from']) =>
   addresses.map(({ name, address }) => (name ? `${name} <${address}>` : address)).join(', ');

const EmailRenderer = ({ email, onBack }: { email: StoredEmail; onBack: () => void }) => {
   const { message } = email;
   const { mode, systemMode } = useColorScheme();
   const colorScheme = mode === 'system' ? systemMode : mode;
   const rootStyle = getComputedStyle(document.documentElement);
   const backgroundColor = rootStyle.getPropertyValue('--joy-palette-background-surface').trim() || '#ffffff';
   const textColor = rootStyle.getPropertyValue('--joy-palette-text-primary').trim() || '#000000';
   const receivedDate = email.internalDate ?? message.date;
   const htmlDocument = message.html
      ? `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:"><style>
         @font-face {
            font-family: Inter;
            src: url("${interRegular}") format("woff2");
            font-style: normal;
            font-weight: 400;
         }
         html, body { min-height: 100%; }
         body {
            background-color: ${backgroundColor};
            color: ${textColor};
            color-scheme: ${colorScheme ?? 'light'};
            font-family: Inter, sans-serif;
         }
      </style></head><body>${message.html}</body></html>`
      : undefined;

   return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
         <Button
            onClick={onBack}
            size={'sm'}
            sx={{ alignSelf: 'flex-start' }}
            variant="plain"
            startDecorator={<ArrowBack />}
         >
            Back to inbox
         </Button>

         <Typography level="h2">{message.subject || '(No subject)'}</Typography>

         <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography>
               <strong>From:</strong> {formatAddresses(message.from)}
            </Typography>
            <Typography>
               <strong>To:</strong> {formatAddresses(message.to)}
            </Typography>
            {message.cc.length > 0 && (
               <Typography>
                  <strong>CC:</strong> {formatAddresses(message.cc)}
               </Typography>
            )}
            {receivedDate && (
               <Typography>
                  <strong>Received:</strong>{' '}
                  {receivedDate.toLocaleString(undefined, {
                     dateStyle: 'medium',
                     timeStyle: 'short',
                  })}
               </Typography>
            )}
         </Box>

         <Divider />

         {htmlDocument ? (
            <Box
               component="iframe"
               title={`Email body: ${message.subject || 'No subject'}`}
               sandbox=""
               srcDoc={htmlDocument}
               sx={{
                  width: '100%',
                  minHeight: 400,
                  border: 'none',
               }}
            />
         ) : (
            <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
               {message.text || 'This message has no body.'}
            </Typography>
         )}
      </Box>
   );
};

export default EmailRenderer;
