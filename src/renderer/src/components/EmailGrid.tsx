import { Box, Typography } from '@mui/joy';
import type { StoredEmail } from '../../../types/email';
import type { SxProps } from '@mui/joy/styles/types';

const truncateSx = {
   whiteSpace: 'nowrap',
   overflow: 'hidden',
   textOverflow: 'ellipsis',
   width: '100%',
} as SxProps;

const EmailGrid = ({ messages }: { messages: StoredEmail[] }) => {
   return (
      <Box
         sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
         }}
      >
         {messages.map((email) => (
            <Box
               key={email.uid}
               sx={{
                  borderBottom: (t) => `1px solid ${t.palette.divider}`,
                  height: 45,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
               }}
            >
               <Typography fontWeight={600} sx={{ display: 'flex', alignItems: 'center', flex: 1, ...truncateSx }}>
                  {email.message.subject}
               </Typography>

               <Typography sx={{ display: 'flex', alignItems: 'center', flex: 5, ...truncateSx }}>
                  {email.message.text}
               </Typography>
            </Box>
         ))}
      </Box>
   );
};

export default EmailGrid;
