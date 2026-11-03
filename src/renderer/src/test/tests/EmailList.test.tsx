import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateSampleEmails } from '../../../../types/email';
import InboxPage from '../../pages/InboxPage';

describe('InboxPage', () => {
   afterEach(() => {
      cleanup();
      Reflect.deleteProperty(window, 'desktop');
   });

   it('renders messages loaded from the desktop mail API', async () => {
      const emails = generateSampleEmails(1);
      const fetchEmails = vi.fn().mockResolvedValue(emails);
      const sendEmail = vi.fn();
      Object.defineProperty(window, 'desktop', {
         configurable: true,
         value: { fetchEmails, sendEmail },
      });

      render(<InboxPage />);

      expect(await screen.findByText(emails[0].message.subject)).toBeTruthy();
      expect(fetchEmails).toHaveBeenCalledWith({ mailbox: 'INBOX', limit: 50 });
   });

   it('sends a composed message through the desktop mail API', async () => {
      const sendEmail = vi.fn().mockResolvedValue({ messageId: '<sent@example.com>' });
      Object.defineProperty(window, 'desktop', {
         configurable: true,
         value: { fetchEmails: vi.fn().mockResolvedValue([]), sendEmail },
      });

      render(<InboxPage />);
      fireEvent.click(screen.getByRole('button', { name: 'Compose' }));
      fireEvent.change(screen.getByPlaceholderText('Recipient email address (separate multiple with commas)'), {
         target: { value: 'first@example.com, second@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText('Subject'), { target: { value: 'Test subject' } });
      fireEvent.change(screen.getByPlaceholderText('Write your message...'), { target: { value: 'Test body' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send email' }));

      await waitFor(() => {
         expect(sendEmail).toHaveBeenCalledWith({
            to: [{ address: 'first@example.com' }, { address: 'second@example.com' }],
            subject: 'Test subject',
            text: 'Test body',
         });
      });
      expect(await screen.findByText('Email sent successfully. Message ID: <sent@example.com>')).toBeTruthy();
   });
});
