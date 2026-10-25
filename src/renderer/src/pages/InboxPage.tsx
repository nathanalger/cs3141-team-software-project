import AttachFile from '@mui/icons-material/AttachFile';
import { Box, Card, Divider, Sheet, Typography } from '@mui/joy';
import { useState } from 'react';
import type { Email } from '../../../shared/email';
import EmailList from '../components/EmailList';
import { sampleEmails } from '../data/sampleEmails';

function formatFullDate(value: string): string {
   const date = new Date(value);

   return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString([], {
           dateStyle: 'medium',
           timeStyle: 'short',
        });
}

const InboxPage = () => {
   const [selectedEmail, setSelectedEmail] = useState<Email | undefined>(
      sampleEmails[0],
   );

   return (
      <Box
         sx={{
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
         }}
      >
         <Typography level="h2">Inbox</Typography>

         <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
            Sample messages are shown while live mailbox syncing is being developed.
         </Typography>

         <Card
            variant="outlined"
            sx={{
               p: 0,
               flex: 1,
               minHeight: 0,
               overflow: 'hidden',
            }}
         >
            <Box sx={{ display: 'flex', height: '100%', minHeight: 0 }}>
               <Sheet
                  sx={{
                     width: { xs: '100%', md: '42%' },
                     maxWidth: 460,
                     minWidth: 260,
                     overflowY: 'auto',
                     borderRight: '1px solid',
                     borderColor: 'divider',
                  }}
               >
                  <EmailList
                     emails={sampleEmails}
                     selectedEmailId={selectedEmail?.id}
                     onSelect={setSelectedEmail}
                  />
               </Sheet>

               <Box
                  sx={{
                     display: { xs: 'none', md: 'flex' },
                     flex: 1,
                     minWidth: 0,
                     flexDirection: 'column',
                     p: 3,
                     overflowY: 'auto',
                  }}
               >
                  {selectedEmail ? (
                     <>
                        <Typography
                           level="h3"
                           sx={{ overflowWrap: 'anywhere' }}
                        >
                           {selectedEmail.subject || '(no subject)'}
                        </Typography>

                        <Divider sx={{ my: 2 }} />

                        <Typography level="title-md">
                           {selectedEmail.from.name ||
                              selectedEmail.from.address}
                        </Typography>

                        <Typography
                           level="body-sm"
                           sx={{ color: 'text.secondary' }}
                        >
                           {selectedEmail.from.name
                              ? `<${selectedEmail.from.address}>`
                              : ''}
                           {' · To: '}
                           {selectedEmail.to
                              .map(
                                 (recipient) =>
                                    recipient.name || recipient.address,
                              )
                              .join(', ')}
                        </Typography>

                        <Typography
                           level="body-xs"
                           sx={{
                              color: 'text.tertiary',
                              mt: 0.5,
                           }}
                        >
                           {formatFullDate(selectedEmail.sentAt)}
                        </Typography>

                        {selectedEmail.hasAttachments && (
                           <Typography
                              level="body-sm"
                              sx={{
                                 display: 'flex',
                                 alignItems: 'center',
                                 gap: 0.5,
                                 mt: 2,
                              }}
                           >
                              <AttachFile fontSize="small" />
                              Includes attachment(s)
                           </Typography>
                        )}

                        <Typography
                           sx={{
                              mt: 3,
                              whiteSpace: 'pre-wrap',
                              overflowWrap: 'anywhere',
                           }}
                        >
                           {selectedEmail.body || selectedEmail.snippet}
                        </Typography>
                     </>
                  ) : (
                     <Typography
                        level="body-md"
                        sx={{
                           color: 'text.secondary',
                           m: 'auto',
                        }}
                     >
                        Select an email to read it.
                     </Typography>
                  )}
               </Box>
            </Box>
         </Card>
      </Box>
   );
};

export default InboxPage;
