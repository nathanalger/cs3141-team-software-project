import { Box, Checkbox, Typography } from '@mui/joy';
import { type StoredEmail } from '../../../types/email';
import type { SxProps } from '@mui/joy/styles/types';
import { useState } from 'react';

const truncateSx = {
   whiteSpace: 'nowrap',
   overflow: 'hidden',
   textOverflow: 'ellipsis',
   minWidth: 0,
} as SxProps;

/**
 * TODO: messages: Message list should be controlled inside this element. For now though, we are using a sample generator.
 */
const EmailGrid = ({
   messages = [],
   onClick,
   showPreview = true,
   showReceivedDate = true,
}: {
   messages?: StoredEmail[];
   onClick?: (storedEmail: StoredEmail) => void;
   showPreview?: boolean;
   showReceivedDate?: boolean;
}) => {
   const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
   const activeSelect = selectedMessages.length > 0;

   const toggleSelectedMessage = (uid: number) => {
      setSelectedMessages((prev) =>
         prev.includes(uid) ? prev.filter((selectedUid) => selectedUid !== uid) : [...prev, uid],
      );
   };

   return (
      <Box
         sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
         }}
      >
         <Box
            sx={{
               width: '100%',
               pb: 2,
               borderBottom: (t) => `1px solid ${t.palette.divider}`,
            }}
         >
            <Typography level="body-sm">
               Displaying {messages.length} emails. {activeSelect && `${selectedMessages.length} message(s) selected.`}
            </Typography>
         </Box>

         {messages.map((email, idx) => (
            <Box key={email.uid}>
               <Box
                  sx={{
                     borderBottom: idx == messages.length - 1 ? 'none' : (t) => `1px solid ${t.palette.divider}`,
                     height: 45,
                     width: '100%',
                     display: 'flex',
                     flexDirection: 'row',
                     alignItems: 'center',
                     cursor: 'pointer',
                     px: 1,
                     '&:hover': {
                        bgcolor: (t) => t.palette.background.popup,
                     },
                  }}
               >
                  <Box
                     sx={{
                        display: 'flex',
                        alignItems: 'center',
                        width: 45,
                        opacity: activeSelect ? '100%' : '65%',
                     }}
                  >
                     <Checkbox
                        checked={selectedMessages.includes(email.uid)}
                        onChange={() => toggleSelectedMessage(email.uid)}
                        sx={{
                           border: 'none',
                           bgcolor: 'transparent',
                        }}
                     />
                  </Box>

                  <Box
                     sx={{
                        display: 'flex',
                        flex: 1,
                        minWidth: 0,
                        userSelect: 'none',
                        height: '100%',
                        alignContent: 'center',
                        flexDirection: 'row',
                        alignItems: 'center',
                     }}
                     onClick={() => {
                        if (activeSelect) toggleSelectedMessage(email.uid);
                        else {
                           onClick?.(email);
                        }
                     }}
                  >
                     <Typography fontWeight={600} sx={{ flex: 1, ...truncateSx, mr: 1 }}>
                        {email.message.subject}
                     </Typography>

                     {showPreview && (
                        <Typography sx={{ flex: 5, ...truncateSx }}>{email.message.text}</Typography>
                     )}

                     {showReceivedDate && (
                        <Typography fontWeight={600} textAlign={'right'} sx={{ ...truncateSx, mx: 1 }}>
                           {(email.internalDate ?? email.message.date)?.toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                           })}
                        </Typography>
                     )}
                  </Box>
               </Box>
            </Box>
         ))}
         {
            // TODO: Replace inbox name with actual name of inbox
            messages.length == 0 && (
               <Box
                  sx={{
                     px: 2,
                     pt: 5,
                     pb: 4,
                     textAlign: 'center',
                  }}
               >
                  <Typography>Your inbox is empty!</Typography>
               </Box>
            )
         }
      </Box>
   );
};

export default EmailGrid;
