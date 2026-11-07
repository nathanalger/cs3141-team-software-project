import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Alert, Box, Button, CircularProgress, Input, Textarea, Typography } from '@mui/joy';
import EmailGrid from '../components/EmailGrid';
import EmailRenderer from '../components/EmailRenderer';
import type { StoredEmail } from '../../../types/email';
import type { Account, EmailAddress, FetchEmailsRequest, MailboxInfo, SendEmailRequest } from '../../../shared/email';
import { useSettings } from '../hooks/useSettings';
import Section from '../components/Section';
import { getSettingKey } from '../../../types/settings';
import PageWrapper from '../architecture/PageWrapper';

const INBOX_FALLBACK: MailboxInfo = {
   path: 'INBOX',
   name: 'Inbox',
   delimiter: '/',
   specialUse: '\\Inbox',
   flags: [],
};

const SPECIAL_FOLDER_LABELS: Record<string, string> = {
   '\\inbox': 'Inbox',
   '\\sent': 'Sent',
   '\\drafts': 'Drafts',
   '\\junk': 'Spam',
   '\\trash': 'Trash',
   '\\archive': 'Archive',
   '\\all': 'All Mail',
   '\\flagged': 'Starred',
};

function mailboxLabel(mailbox: MailboxInfo): string {
   const specialUse = mailbox.specialUse?.toLowerCase();
   if (specialUse && SPECIAL_FOLDER_LABELS[specialUse]) return SPECIAL_FOLDER_LABELS[specialUse];
   const name = mailbox.name || mailbox.path;
   if (/^(spam|junk)$/i.test(name)) return 'Spam';
   if (/^sent(mail)?$/i.test(name)) return 'Sent';
   if (/^trash|deleted items$/i.test(name)) return 'Trash';
   if (/^drafts?$/i.test(name)) return 'Drafts';
   return name;
}

function mailboxOrder(mailbox: MailboxInfo): number {
   const label = mailboxLabel(mailbox).toLowerCase();
   const order = ['inbox', 'starred', 'sent', 'drafts', 'spam', 'trash', 'archive', 'all mail'];
   const index = order.indexOf(label);
   return index < 0 ? order.length : index;
}

function normalizeEmails(emails: StoredEmail[]): StoredEmail[] {
   return emails.map((email) => ({
      ...email,
      message: {
         ...email.message,
         ...(email.message.date
            ? { date: email.message.date instanceof Date ? email.message.date : new Date(email.message.date) }
            : {}),
      },
      flags: new Set(email.flags),
      ...(email.internalDate
         ? { internalDate: email.internalDate instanceof Date ? email.internalDate : new Date(email.internalDate) }
         : {}),
   }));
}

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

const InboxPage = () => {
   const [accounts, setAccounts] = useState<Account[]>([]);
   const [accountsLoading, setAccountsLoading] = useState(true);
   const [selectedAccountID, setSelectedAccountID] = useState<number>();
   const [mailboxes, setMailboxes] = useState<MailboxInfo[]>([INBOX_FALLBACK]);
   const [mailboxesLoading, setMailboxesLoading] = useState(false);
   const [selectedMailbox, setSelectedMailbox] = useState('INBOX');
   const [messages, setMessages] = useState<StoredEmail[]>([]);
   const [openedEmail, setOpenedEmail] = useState<StoredEmail | undefined>(undefined);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string>();
   const [composeOpen, setComposeOpen] = useState(false);
   const [recipients, setRecipients] = useState('');
   const [ccRecipients, setCcRecipients] = useState('');
   const [bccRecipients, setBccRecipients] = useState('');
   const [subject, setSubject] = useState('');
   const [body, setBody] = useState('');
   const [sending, setSending] = useState(false);
   const [sendStatus, setSendStatus] = useState<string>();
   const fetchRequestID = useRef(0);
   const { values } = useSettings();

   useEffect(() => {
      let active = true;
      window.desktop.getAccounts()
         .then((loadedAccounts) => {
            if (!active) return;
            setAccounts(loadedAccounts);
            const initialAccount = loadedAccounts.find((account) => account.isDefault) ?? loadedAccounts[0];
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
   }, []);

   useEffect(() => {
      if (selectedAccountID === undefined) {
         setMailboxes([INBOX_FALLBACK]);
         setSelectedMailbox('INBOX');
         return;
      }

      let active = true;
      setMailboxesLoading(true);
      setMailboxes([INBOX_FALLBACK]);
      setSelectedMailbox('INBOX');
      window.desktop.listMailboxes(selectedAccountID)
         .then((loadedMailboxes) => {
            if (!active) return;
            const withInbox = loadedMailboxes.some((mailbox) => mailbox.path.toUpperCase() === 'INBOX')
               ? loadedMailboxes
               : [INBOX_FALLBACK, ...loadedMailboxes];
            const visibleMailboxes = withInbox
               .filter((mailbox) => !mailbox.flags.some((flag) => flag.toLowerCase() === '\\noselect'))
               .sort((left, right) => mailboxOrder(left) - mailboxOrder(right) || left.name.localeCompare(right.name));
            setMailboxes(visibleMailboxes.length ? visibleMailboxes : [INBOX_FALLBACK]);
         })
         .catch((cause: unknown) => {
            if (active) {
               setMailboxes([INBOX_FALLBACK]);
               setError(errorText(cause, 'Unable to load folders for this account.'));
            }
         })
         .finally(() => {
            if (active) setMailboxesLoading(false);
         });
      return () => {
         active = false;
      };
   }, [selectedAccountID]);

   const loadInbox = useCallback(async () => {
      if (selectedAccountID === undefined) {
         setMessages([]);
         return;
      }
      const requestID = ++fetchRequestID.current;
      setLoading(true);
      setError(undefined);
      try {
         const request = {
            accountID: selectedAccountID,
            mailbox: selectedMailbox,
            limit: 50,
         } satisfies FetchEmailsRequest;
         const fetched = await window.desktop.fetchEmails(request);
         if (requestID === fetchRequestID.current) setMessages(normalizeEmails(fetched));
      } catch (cause) {
         if (requestID === fetchRequestID.current) {
            setError(errorText(cause, `Unable to fetch messages from ${selectedMailbox}.`));
            setMessages([]);
         }
      } finally {
         if (requestID === fetchRequestID.current) setLoading(false);
      }
   }, [selectedAccountID, selectedMailbox]);

   useEffect(() => {
      if (accountsLoading) return;
      void loadInbox();
   }, [accountsLoading, loadInbox]);

   const selectAccount = (accountID: number) => {
      setSelectedAccountID(accountID);
      setSelectedMailbox('INBOX');
      setOpenedEmail(undefined);
      setMessages([]);
      setError(undefined);
      setSendStatus(undefined);
   };

   const selectMailbox = (mailbox: string) => {
      setSelectedMailbox(mailbox);
      setOpenedEmail(undefined);
      setMessages([]);
      setError(undefined);
   };

   const send = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (selectedAccountID === undefined) return;
      setSending(true);
      setSendStatus(undefined);
      setError(undefined);
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
         setComposeOpen(false);
      } catch (cause) {
         setError(errorText(cause, 'Unable to send email.'));
      } finally {
         setSending(false);
      }
   };

   const showPreview = values[getSettingKey('inbox', 'message-list', 'show-preview')] !== false;
   const showReceivedDate = values[getSettingKey('inbox', 'message-list', 'show-received-date')] !== false;
   const selectedAccount = accounts.find((account) => account.accountID === selectedAccountID);
   const selectedMailboxInfo = mailboxes.find((mailbox) => mailbox.path === selectedMailbox);

   return (
      <PageWrapper>
         <Section>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
               <Typography level="h2" sx={{ flex: 1, minWidth: '120px' }}>Mail</Typography>
               <Typography level="body-sm">Account</Typography>
               <select
                  aria-label="Select email account"
                  value={selectedAccountID ?? ''}
                  disabled={accountsLoading || accounts.length === 0}
                  onChange={(event) => selectAccount(Number(event.target.value))}
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
               <Button onClick={() => setComposeOpen((open) => !open)} disabled={!selectedAccount || !selectedAccount.smtpHost}>
                  {composeOpen ? 'Close compose' : 'Compose'}
               </Button>
               <Button variant="outlined" onClick={() => void loadInbox()} loading={loading} disabled={!selectedAccount}>
                  Refresh
               </Button>
            </Box>

            {accounts.length === 0 && !accountsLoading && (
               <Alert color="warning" sx={{ mb: 2 }}>
                  No email accounts are configured. Add an account in Settings before using the inbox.
               </Alert>
            )}
            {error && <Alert color="danger" sx={{ mb: 2 }}>{error}</Alert>}
            {sendStatus && <Alert color="success" sx={{ mb: 2 }}>{sendStatus}</Alert>}

            {composeOpen && (
               <Box
                  component="form"
                  onSubmit={send}
                  sx={{
                     display: 'flex',
                     flexDirection: 'column',
                     gap: 1,
                     mb: 3,
                     p: 2,
                     border: '1px solid',
                     borderColor: 'divider',
                     borderRadius: 'sm',
                  }}
               >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                     <Typography level="title-lg" sx={{ flex: 1 }}>New email</Typography>
                     <Typography level="body-xs" color="neutral">
                        Sending from {selectedAccount?.email}
                     </Typography>
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
                  <Input required placeholder="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
                  <Textarea
                     required
                     minRows={8}
                     placeholder="Write your message..."
                     value={body}
                     onChange={(event) => setBody(event.target.value)}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                     <Button type="button" variant="plain" color="neutral" onClick={() => setComposeOpen(false)}>
                        Discard
                     </Button>
                     <Button type="submit" loading={sending} disabled={sending || !selectedAccount}>
                        Send email
                     </Button>
                  </Box>
               </Box>
            )}

            <Box sx={{ display: 'flex', minHeight: 420, gap: 2, alignItems: 'stretch' }}>
               {!openedEmail && (
                  <Box
                     component="nav"
                     aria-label="Email folders"
                     sx={{
                        width: { xs: 112, sm: 160, md: 190 },
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        pr: 1,
                     }}
                  >
                     <Typography level="title-sm" sx={{ px: 1, pb: 0.5 }}>Folders</Typography>
                     {mailboxesLoading && <CircularProgress size="sm" sx={{ alignSelf: 'center', my: 1 }} />}
                     {mailboxes.map((mailbox) => (
                        <Button
                           key={mailbox.path}
                           size="sm"
                           variant={selectedMailbox === mailbox.path ? 'soft' : 'plain'}
                           color={selectedMailbox === mailbox.path ? 'primary' : 'neutral'}
                           onClick={() => selectMailbox(mailbox.path)}
                           sx={{ justifyContent: 'flex-start', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                           {mailboxLabel(mailbox)}
                        </Button>
                     ))}
                  </Box>
               )}

               <Box sx={{ flex: 1, minWidth: 0 }}>
                  {loading && messages.length === 0 ? (
                     <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                  ) : openedEmail ? (
                     <EmailRenderer email={openedEmail} onBack={() => setOpenedEmail(undefined)} />
                  ) : (
                     <>
                        <Typography level="title-md" sx={{ mb: 1 }}>
                           {selectedMailboxInfo ? mailboxLabel(selectedMailboxInfo) : selectedMailbox}
                        </Typography>
                        <EmailGrid
                           key={`${selectedAccountID ?? 'none'}:${selectedMailbox}`}
                           messages={messages}
                           onClick={setOpenedEmail}
                           showPreview={showPreview}
                           showReceivedDate={showReceivedDate}
                        />
                     </>
                  )}
               </Box>
            </Box>
         </Section>
      </PageWrapper>
   );
};

export default InboxPage;
