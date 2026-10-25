import { Box, List, Typography } from '@mui/joy';
import type { Email } from '../../../shared/email';
import EmailRow from './EmailRow';

export interface EmailListProps {
   emails: Email[];
   selectedEmailId?: string;
   onSelect: (email: Email) => void;
   loading?: boolean;
   error?: string | null;
}

const EmailList = ({ emails, selectedEmailId, onSelect, loading = false, error = null }: EmailListProps) => {
   if (loading) {
      return <Box role="status" sx={{ p: 3 }}><Typography>Loading emails…</Typography></Box>;
   }

   if (error) {
      return <Box role="alert" sx={{ p: 3 }}><Typography color="danger">Unable to load emails: {error}</Typography></Box>;
   }

   if (emails.length === 0) {
      return <Box sx={{ p: 3, textAlign: 'center' }}><Typography level="body-md">Your inbox is empty.</Typography></Box>;
   }

   return (
      <List aria-label="Email list" sx={{ p: 0, '--ListItem-radius': '0px' }}>
         {emails.map((email) => (
            <EmailRow
               key={email.id}
               email={email}
               selected={email.id === selectedEmailId}
               onSelect={onSelect}
            />
         ))}
      </List>
   );
};

export default EmailList;
