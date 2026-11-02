import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Alert, Box, Button, CircularProgress, Input, Textarea, Typography } from '@mui/joy';
import EmailGrid from '../components/EmailGrid';
import EmailRenderer from '../components/EmailRenderer';
import type { StoredEmail } from '../../../types/email';
import type { FetchEmailsRequest, SendEmailRequest } from '../../../shared/email';
import { useSettings } from '../hooks/useSettings';
import Section from '../components/Section';
import { getSettingKey } from '../../../types/settings';
import PageWrapper from '../architecture/PageWrapper';
import { Alert } from '@mui/joy';

const InboxPage = () => {
   const [messages, setMessages] = useState<StoredEmail[]>([]);
   const [openedEmail, setOpenedEmail] = useState<StoredEmail | undefined>(undefined);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | undefined>();
   const [composeOpen, setComposeOpen] = useState(false);
   const [recipients, setRecipients] = useState('');
   const [subject, setSubject] = useState('');
   const [body, setBody] = useState('');
   const [sending, setSending] = useState(false);
   const [sendStatus, setSendStatus] = useState<string | undefined>();
   const { values } = useSettings();

   const loadInbox = useCallback(async () => {
      setLoading(true);
      setError(undefined);
      try {
         const fetched = await window.desktop.fetchEmails({ mailbox: 'INBOX', limit: 50 } satisfies FetchEmailsRequest);
         setMessages(fetched.map((email) => ({
            message: {
               ...email.message,
               date: email.message.date,
            },
            mailbox: email.mailbox,
            uid: email.uid,
            uidValidity: email.uidValidity,
            flags: new Set(email.flags),
            internalDate: email.internalDate ? new Date(email.internalDate) : undefined,
            size: email.size,
         })));
      } catch (cause) {
         setError(cause instanceof Error ? cause.message : 'Unable to fetch messages from the IMAP server.');
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => { void loadInbox(); }, [loadInbox]);

   const send = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSending(true);
      setSendStatus(undefined);
      setError(undefined);
      try {
         const request: SendEmailRequest = {
            to: recipients.split(/[;,]/).map((address) => ({ address: address.trim() })).filter((item) => item.address),
            subject,
            text: body,
         };
         const result = await window.desktop.sendEmail(request);
         setSendStatus(`Email sent successfully. Message ID: ${result.messageId}`);
         setRecipients('');
         setSubject('');
         setBody('');
         setComposeOpen(false);
      } catch (cause) {
         setError(cause instanceof Error ? cause.message : 'Unable to send email.');
      } finally {
         setSending(false);
      }
   };

   const showPreview = values[getSettingKey('inbox', 'message-list', 'show-preview')] !== false;
   const showReceivedDate = values[getSettingKey('inbox', 'message-list', 'show-received-date')] !== false;

   return (
      <Section>
         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography level="h2" sx={{ flex: 1 }}>Inbox</Typography>
            <Button onClick={() => setComposeOpen((open) => !open)}>{composeOpen ? 'Close compose' : 'Compose'}</Button>
            <Button variant="outlined" onClick={() => void loadInbox()} loading={loading}>Refresh</Button>
         </Box>

         {error && <Alert color="danger" sx={{ mb: 2 }}>{error}</Alert>}
         {sendStatus && <Alert color="success" sx={{ mb: 2 }}>{sendStatus}</Alert>}

         {composeOpen && (
            <Box component="form" onSubmit={send} sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 'sm' }}>
               <Typography level="title-lg">New email</Typography>
               <Input required type="text" placeholder="Recipient email address (separate multiple with commas)" value={recipients} onChange={(event) => setRecipients(event.target.value)} />
               <Input required placeholder="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
               <Textarea required minRows={6} placeholder="Write your message..." value={body} onChange={(event) => setBody(event.target.value)} />
               <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="submit" loading={sending} disabled={sending}>Send email</Button>
               </Box>
            </Box>
         )}

         {loading && messages.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
         ) : openedEmail ? (
            <EmailRenderer email={openedEmail} onBack={() => setOpenedEmail(undefined)} />
         ) : (
            <EmailGrid messages={messages} onClick={setOpenedEmail} showPreview={showPreview} showReceivedDate={showReceivedDate} />
         )}
      </Section>
   );
};

export default InboxPage;
