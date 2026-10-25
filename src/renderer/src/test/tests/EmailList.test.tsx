import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Email } from '../../../../shared/email';
import EmailList from '../../components/EmailList';

const emailFixture: Email = {
   id: 'test-email-1',
   accountId: 1,
   subject: 'Test subject',
   from: {
      name: 'Test Sender',
      address: 'sender@example.com',
   },
   to: [
      { address: 'recipient@example.com' },
   ],
   sentAt: '2026-10-24T12:00:00Z',
   snippet: 'This is a test preview.',
   hasAttachments: false,
   isRead: false,
   isFlagged: false,
};

describe('EmailList', () => {
   it('renders an email and selects it when clicked', () => {
      const onSelect = vi.fn();

      render(
         <EmailList
            emails={[emailFixture]}
            onSelect={onSelect}
         />,
      );

      fireEvent.click(screen.getByText('Test subject'));

      expect(
         screen.getByText('This is a test preview.'),
      ).toBeInTheDocument();

      expect(onSelect).toHaveBeenCalledWith(emailFixture);
   });

   it('shows a loading state', () => {
      render(
         <EmailList
            emails={[]}
            onSelect={vi.fn()}
            loading
         />,
      );

      expect(screen.getByRole('status')).toHaveTextContent(
         /Loading emails/i,
      );
   });

   it('shows an error state', () => {
      render(
         <EmailList
            emails={[]}
            onSelect={vi.fn()}
            error="Test server unavailable"
         />,
      );

      expect(screen.getByRole('alert')).toHaveTextContent(
         /Test server unavailable/i,
      );
   });

   it('shows an empty state when no emails exist', () => {
      render(
         <EmailList
            emails={[]}
            onSelect={vi.fn()}
         />,
      );

      expect(
         screen.getByText(/Your inbox is empty/i),
      ).toBeInTheDocument();
   });
});
