import { Box, Chip, ListItemButton, Typography } from '@mui/joy';
import AttachFile from '@mui/icons-material/AttachFile';
import type { Email } from '../../../shared/email';

export interface EmailRowProps {
   email: Email;
   selected?: boolean;
   onSelect: (email: Email) => void;
}

function formatDate(value: string): string {
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return value;
   const now = new Date();
   const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
   return sameDay
      ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const EmailRow = ({ email, selected = false, onSelect }: EmailRowProps) => {
   const sender = email.from.name?.trim() || email.from.address;

   return (
      <ListItemButton
         selected={selected}
         onClick={() => onSelect(email)}
         aria-label={`Email from ${sender}: ${email.subject || '(no subject)'}`}
         sx={{
            alignItems: 'flex-start',
            display: 'flex',
            gap: 1,
            p: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: email.isRead ? undefined : 'background.level1',
            '&.Mui-selected': { bgcolor: 'primary.softBg' },
         }}
      >
         <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
               {!email.isRead && <Box aria-label="Unread" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'primary.500', flexShrink: 0 }} />}
               <Typography level="title-sm" noWrap sx={{ fontWeight: email.isRead ? 'normal' : 'bold', flex: 1 }}>
                  {sender}
               </Typography>
               <Typography level="body-xs" sx={{ flexShrink: 0, color: 'text.tertiary' }}>
                  {formatDate(email.sentAt)}
               </Typography>
            </Box>
            <Typography level="title-sm" noWrap sx={{ fontWeight: email.isRead ? 'normal' : 'bold' }}>
               {email.subject || '(no subject)'}
            </Typography>
            <Typography level="body-sm" noWrap sx={{ color: 'text.secondary', mt: 0.25 }}>
               {email.snippet}
            </Typography>
            {(email.hasAttachments || email.isFlagged) && (
               <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75 }}>
                  {email.hasAttachments && <Chip size="sm" variant="soft" startDecorator={<AttachFile fontSize="small" />}>Attachment</Chip>}
                  {email.isFlagged && <Chip size="sm" variant="soft" color="warning">Flagged</Chip>}
               </Box>
            )}
         </Box>
      </ListItemButton>
   );
};

export default EmailRow;
