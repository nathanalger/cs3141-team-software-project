import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InboxPage from '../../pages/InboxPage';

describe('Home', () => {
   it('loads the inbox from the desktop mail API', async () => {
      const fetchEmails = vi.fn().mockResolvedValue([]);
      Object.defineProperty(window, 'desktop', {
         configurable: true,
         value: { fetchEmails },
      });

      const { container } = render(<InboxPage />);

      expect(container.firstChild).not.toBeNull();
      expect(await screen.findByText('Your inbox is empty!')).toBeInTheDocument();
      expect(fetchEmails).toHaveBeenCalledWith({ mailbox: 'INBOX', limit: 50 });
   });
});
