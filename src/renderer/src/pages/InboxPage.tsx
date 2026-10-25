import { Card } from '@mui/joy';
import EmailGrid from '../components/EmailGrid';
import EmailRenderer from '../components/EmailRenderer';
import { generateSampleEmails, type StoredEmail } from '../../../types/email';
import { useState } from 'react';

const InboxPage = () => {
   const [messages] = useState(() => generateSampleEmails());
   const [openedEmail, setOpenedEmail] = useState<StoredEmail | undefined>(undefined);

   return (
      <Card>
         {!openedEmail && (
            <EmailGrid
               messages={messages}
               onClick={setOpenedEmail}
            />
         )}
         {openedEmail && <EmailRenderer email={openedEmail} onBack={() => setOpenedEmail(undefined)} />}
      </Card>
   );
};

export default InboxPage;
