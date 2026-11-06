import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateSampleEmails } from '../../../../types/email';
import type { Account, MailboxInfo } from '../../../../shared/email';
import InboxPage from '../../pages/InboxPage';

const accounts: Account[] = [
   {
      accountID: 1,
      fName: 'Test',
      lName: 'User',
      displayName: 'Primary account',
      email: 'primary@example.com',
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecurity: 'tls',
      imapUser: 'primary@example.com',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpSecurity: 'starttls',
      smtpUser: 'primary@example.com',
      isDefault: true,
   },
   {
      accountID: 2,
      fName: 'Second',
      lName: 'User',
      email: 'second@example.com',
      imapHost: 'imap.example.net',
      imapPort: 993,
      imapSecurity: 'tls',
      imapUser: 'second@example.com',
      smtpHost: 'smtp.example.net',
      smtpPort: 587,
      smtpSecurity: 'starttls',
      smtpUser: 'second@example.com',
      isDefault: false,
   },
];

const mailboxes: MailboxInfo[] = [
   { path: 'INBOX', name: 'INBOX', delimiter: '/', specialUse: '\\Inbox', flags: [] },
   { path: 'Sent', name: 'Sent', delimiter: '/', specialUse: '\\Sent', flags: [] },
   { path: 'Spam', name: 'Spam', delimiter: '/', specialUse: '\\Junk', flags: [] },
   { path: 'Trash', name: 'Trash', delimiter: '/', specialUse: '\\Trash', flags: [] },
];

type DesktopMocks = Partial<Record<'getAccounts' | 'listMailboxes' | 'fetchEmails' | 'sendEmail', ReturnType<typeof vi.fn>>>;

function installDesktop(overrides: DesktopMocks = {}) {
   const desktop = {
      getAccounts: vi.fn().mockResolvedValue(accounts),
      listMailboxes: vi.fn().mockResolvedValue(mailboxes),
      fetchEmails: vi.fn().mockResolvedValue([]),
      sendEmail: vi.fn().mockResolvedValue({ messageId: '<sent@example.com>' }),
      ...overrides,
   };
   Object.defineProperty(window, 'desktop', { configurable: true, value: desktop });
   return desktop;
}

describe('InboxPage', () => {
   afterEach(() => {
      cleanup();
      Reflect.deleteProperty(window, 'desktop');
   });

   it('renders messages loaded from the selected account and folder', async () => {
      const emails = generateSampleEmails(1);
      const desktop = installDesktop({ fetchEmails: vi.fn().mockResolvedValue(emails) });

      render(<InboxPage />);

      expect(await screen.findByText(emails[0].message.subject)).toBeTruthy();
      expect(desktop.fetchEmails).toHaveBeenCalledWith({ accountID: 1, mailbox: 'INBOX', limit: 50 });
      expect(desktop.listMailboxes).toHaveBeenCalledWith(1);
   });

   it('switches accounts and fetches the selected account mailbox', async () => {
      const desktop = installDesktop();

      render(<InboxPage />);
      await screen.findByRole('button', { name: 'Inbox' });

      fireEvent.change(screen.getByRole('combobox', { name: 'Select email account' }), {
         target: { value: '2' },
      });

      await waitFor(() => {
         expect(desktop.listMailboxes).toHaveBeenCalledWith(2);
         expect(desktop.fetchEmails).toHaveBeenCalledWith({ accountID: 2, mailbox: 'INBOX', limit: 50 });
      });
   });

   it('switches between server-provided folders', async () => {
      const desktop = installDesktop();

      render(<InboxPage />);
      await screen.findByRole('button', { name: 'Spam' });
      fireEvent.click(screen.getByRole('button', { name: 'Sent' }));

      await waitFor(() => {
         expect(desktop.fetchEmails).toHaveBeenCalledWith({ accountID: 1, mailbox: 'Sent', limit: 50 });
      });
   });

   it('sends a composed message through the selected account', async () => {
      const sendEmail = vi.fn().mockResolvedValue({ messageId: '<sent@example.com>' });
      installDesktop({ sendEmail });

      render(<InboxPage />);
      fireEvent.click(await screen.findByRole('button', { name: 'Compose' }));
      fireEvent.change(screen.getByPlaceholderText('To: recipient@example.com (separate multiple with commas)'), {
         target: { value: 'first@example.com, second@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('CC (optional)'), {
         target: { value: 'copy@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('BCC (optional)'), {
         target: { value: 'hidden@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Subject'), { target: { value: 'Test subject' } });
      fireEvent.change(screen.getByPlaceholderText('Write your message...'), { target: { value: 'Test body' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send email' }));

      await waitFor(() => {
         expect(sendEmail).toHaveBeenCalledWith({
            accountID: 1,
            to: [{ address: 'first@example.com' }, { address: 'second@example.com' }],
            cc: [{ address: 'copy@example.com' }],
            bcc: [{ address: 'hidden@example.com' }],
            subject: 'Test subject',
            text: 'Test body',
         });
      });
      expect(await screen.findByText('Email sent successfully. Message ID: <sent@example.com>')).toBeTruthy();
   });
});
