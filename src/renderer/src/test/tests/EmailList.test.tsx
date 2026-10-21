import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import InboxPage from '../../pages/InboxPage';

describe('Home', () => {
   it('renders without errors', () => {
      const { container } = render(<InboxPage />);

      expect(container.firstChild).not.toBeNull();
   });
});
