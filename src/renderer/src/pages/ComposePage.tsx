import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Box, Button, Input, Textarea, Typography } from '@mui/joy';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Account, EmailAddress, SendEmailRequest } from '../../../shared/email';
import PageWrapper from '../architecture/PageWrapper';
import Section from '../components/Section';

function parseAddresses(value: string): EmailAddress[] {
   return value
      .split(/[;,]/)
      .map((address) => address.trim())
      .filter(Boolean)
      .map((address) => ({ address }));
}

function errorText(cause: unknown, fallback: string): string {
   return cause instanceof Error ? cause.message : fallback;
}

const ComposePage = () => {
   const location = useLocation();
   const navigate = useNavigate();
   const [accounts, setAccounts] = useState<Account[]>([]);
   const [accountsLoading, setAccountsLoading] = useState(true);
   const [selectedAccountID, setSelectedAccountID] = useState<number>();
   const [recipients, setRecipients] = useState('');
   const [ccRecipients, setCcRecipients] = useState('');
   const [bccRecipients, setBccRecipients] = useState('');
   const [subject, setSubject] = useState('');
   const [body, setBody] = useState('');
   const [sending, setSending] = useState(false);
   const [error, setError] = useState<string>();
   const [sendStatus, setSendStatus] = useState<string>();

   useEffect(() => {
      let active = true;
      window.desktop
         .getAccounts()
         .then((loadedAccounts) => {
            if (!active) return;
            setAccounts(loadedAccounts);
            const routeAccountID =
               typeof location.state === 'object' &&
               location.state !== null &&
               'accountID' in location.state &&
               typeof location.state.accountID === 'number'
                  ? location.state.accountID
                  : undefined;
            const initialAccount =
               loadedAccounts.find((account) => account.accountID === routeAccountID) ??
               loadedAccounts.find((account) => account.isDefault) ??
               loadedAccounts[0];
            setSelectedAccountID(initialAccount?.accountID);
         })
         .catch((cause: unknown) => {
            if (active) setError(errorText(cause, 'Unable to load email accounts.'));
         })
         .finally(() => {
            if (active) setAccountsLoading(false);
         });
      return () => {
         active = false;
      };
   }, [location.state]);

   const selectedAccount = accounts.find((account) => account.accountID === selectedAccountID);

   const send = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (selectedAccountID === undefined) return;
      setSending(true);
      setError(undefined);
      setSendStatus(undefined);
      try {
         const to = parseAddresses(recipients);
         const cc = parseAddresses(ccRecipients);
         const bcc = parseAddresses(bccRecipients);
         const request: SendEmailRequest = {
            accountID: selectedAccountID,
            to,
            ...(cc.length ? { cc } : {}),
            ...(bcc.length ? { bcc } : {}),
            subject,
            text: body,
         };
         const result = await window.desktop.sendEmail(request);
         setSendStatus(`Email sent successfully. Message ID: ${result.messageId}`);
         setRecipients('');
         setCcRecipients('');
         setBccRecipients('');
         setSubject('');
         setBody('');
      } catch (cause) {
         setError(errorText(cause, 'Unable to send email.'));
      } finally {
         setSending(false);
      }
   };

   return (
      <PageWrapper>
         <Section>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
               <Typography level="h2" sx={{ flex: 1 }}>
                  Compose email
               </Typography>
               <Button variant="outlined" color="neutral" onClick={() => navigate('/inbox')}>
                  Back to inbox
               </Button>
            </Box>

            {accounts.length === 0 && !accountsLoading && (
               <Alert color="warning" sx={{ mb: 2 }}>
                  No email accounts are configured. Add an account in Settings before composing an email.
               </Alert>
            )}
            {error && (
               <Alert color="danger" sx={{ mb: 2 }}>
                  {error}
               </Alert>
            )}
            {sendStatus && (
               <Alert color="success" sx={{ mb: 2 }}>
                  {sendStatus}
               </Alert>
            )}

            <Box
               component="form"
               onSubmit={send}
               sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  maxWidth: 900,
               }}
            >
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                  <Typography level="body-sm">Sending from</Typography>
                  <select
                     aria-label="Select sending account"
                     value={selectedAccountID ?? ''}
                     disabled={accountsLoading || sending || accounts.length === 0}
                     onChange={(event) => setSelectedAccountID(Number(event.target.value))}
                     style={{
                        minWidth: 220,
                        maxWidth: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--joy-palette-neutral-outlinedBorder)',
                        background: 'var(--joy-palette-background-surface)',
                        color: 'var(--joy-palette-text-primary)',
                     }}
                  >
                     {accounts.map((account) => (
                        <option key={account.accountID} value={account.accountID}>
                           {account.displayName || account.email} {account.isDefault ? '(Default)' : ''}
                        </option>
                     ))}
                  </select>
               </Box>
               <Input
                  required
                  type="text"
                  placeholder="To: recipient@example.com (separate multiple with commas)"
                  value={recipients}
                  onChange={(event) => setRecipients(event.target.value)}
               />
               <Input
                  type="text"
                  placeholder="CC (optional)"
                  value={ccRecipients}
                  onChange={(event) => setCcRecipients(event.target.value)}
               />
               <Input
                  type="text"
                  placeholder="BCC (optional)"
                  value={bccRecipients}
                  onChange={(event) => setBccRecipients(event.target.value)}
               />
               <Input
                  required
                  placeholder="Subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
               />
               <Textarea
                  required
                  minRows={8}
                  placeholder="Write your message..."
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
               />
               <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button type="button" variant="plain" color="neutral" onClick={() => navigate('/inbox')}>
                     Discard
                  </Button>
                  <Button
                     type="submit"
                     loading={sending}
                     disabled={sending || accountsLoading || !selectedAccount?.smtpHost}
                  >
                     Send email
                  </Button>
               </Box>
            </Box>
         </Section>
      </PageWrapper>
   );
};

export default ComposePage;
