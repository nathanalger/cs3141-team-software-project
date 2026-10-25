import type { Email } from '../../../shared/email';

/** Local-only fixture data for developing the inbox before IMAP syncing is implemented. */
export const sampleEmails: Email[] = [
   {
      id: 'sample-1',
      accountId: 1,
      subject: 'Welcome to the team project!',
      from: { name: 'Project Team', address: 'pteam@example.com' },
      to: [{ name: 'You', address: 'you@example.com' }],
      sentAt: '2026-10-24T13:15:00-04:00',
      snippet: 'Here are the next steps for our email client and the tasks for this sprint.',
      body: 'Welcome to the team project!\n\nOur next steps are to finish the reusable inbox components and verify secure IMAP and SMTP connections.',
      hasAttachments: true,
      isRead: false,
      isFlagged: true,
   },
   {
      id: 'sample-2',
      accountId: 1,
      subject: 'Meeting notes',
      from: { name: 'Michael Sheldon', address: 'msheldon@example.com' },
      to: [{ name: 'You', address: 'you@example.com' }],
      sentAt: '2026-10-23T16:40:00-04:00',
      snippet: 'Thanks for meeting today. Here is a summary of the decisions and action items.',
      body: 'Thanks for meeting today.\n\nAction items:\n- Finish the shared email types.\n- Add list and row components.\n- Test TLS connections against the mail test servers.',
      hasAttachments: false,
      isRead: true,
      isFlagged: false,
   },
   {
      id: 'sample-3',
      accountId: 1,
      subject: 'Test environment credentials',
      from: { name: 'John Smith', address: 'jsmith@example.com' },
      to: [{ name: 'You', address: 'you@example.com' }],
      sentAt: '2026-10-22T09:05:00-04:00',
      snippet: 'Use your assigned test mailbox credentials in local environment variables only.',
      body: 'Use your assigned test mailbox credentials in local environment variables only. Do not commit passwords or add them to screenshots or logs.',
      hasAttachments: false,
      isRead: true,
      isFlagged: false,
   },
];