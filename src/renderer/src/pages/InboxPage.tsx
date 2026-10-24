import { Card } from '@mui/joy';
import EmailGrid from '../components/EmailGrid';
import { generateSampleEmails } from '../../../types/email';

const InboxPage = () => {
   return (
      <Card>
         <EmailGrid messages={generateSampleEmails()} />
      </Card>
   );
};

export default InboxPage;
