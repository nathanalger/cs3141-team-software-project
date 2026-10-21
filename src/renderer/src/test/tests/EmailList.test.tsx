import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EmailList from '../../pages/EmailList';

describe('Home', () => {
   it('renders without errors', () => {
      const { container } = render(<EmailList />);

      expect(container.firstChild).not.toBeNull();
   });
});
