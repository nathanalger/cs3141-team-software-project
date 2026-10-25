import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { generateSampleEmails } from '../../../../types/email';
import EmailGrid from '../../components/EmailGrid';

describe('EmailGrid', () => {
   it('renders each email and vertically centers its row content', () => {
      const messages = generateSampleEmails(3);
      render(<EmailGrid messages={messages} />);

      for (const email of messages) {
         const subject = screen.getByText(email.message.subject);
         const row = subject.closest('.MuiBox-root');

         expect(row).not.toBeNull();
         expect(window.getComputedStyle(row!).alignItems).toBe('center');
      }
   });
});
