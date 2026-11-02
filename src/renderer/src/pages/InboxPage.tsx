import EmailGrid from '../components/EmailGrid';
import EmailRenderer from '../components/EmailRenderer';
import { generateSampleEmails, type StoredEmail } from '../../../types/email';
import { useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import Section from '../components/Section';
import { getSettingKey } from '../../../types/settings';
import PageWrapper from '../architecture/PageWrapper';
import { Alert } from '@mui/joy';

const InboxPage = () => {
   const [messages] = useState(() => generateSampleEmails());
   const [openedEmail, setOpenedEmail] = useState<StoredEmail | undefined>(undefined);
   const { values } = useSettings();
   const showPreview = values[getSettingKey('inbox', 'message-list', 'show-preview')] !== false;
   const showReceivedDate = values[getSettingKey('inbox', 'message-list', 'show-received-date')] !== false;

   return (
      <PageWrapper>
         <Alert color="warning">These are just placeholder emails currently, and do not reflect what is in an account's actual inbox.</Alert>
         <Section>
            {!openedEmail && (
               <EmailGrid
                  messages={messages}
                  onClick={setOpenedEmail}
                  showPreview={showPreview}
                  showReceivedDate={showReceivedDate}
               />
            )}
            {openedEmail && <EmailRenderer email={openedEmail} onBack={() => setOpenedEmail(undefined)} />}
         </Section>
      </PageWrapper>
   );
};

export default InboxPage;
