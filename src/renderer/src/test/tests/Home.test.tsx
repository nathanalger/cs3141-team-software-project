import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Home from '../../pages/Home';

describe('Home', () => {
   it('renders without errors', () => {
      const { container } = render(<Home />);

      expect(container.firstChild).not.toBeNull();
   });
});
