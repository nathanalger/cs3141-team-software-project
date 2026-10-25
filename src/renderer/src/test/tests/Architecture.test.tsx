import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { router } from '../../router';
import { RouterProvider } from 'react-router-dom';
import PageWrapper from '../../architecture/PageWrapper';
import ThemeColorProvider from '../../architecture/ThemeColorProvider';
import Architecture from '../../architecture/ErrorCatch';
import { vi } from 'vitest';

describe('Architecture', () => {
   it('renders router provider successfully', () => {
      const { container } = render(<RouterProvider router={router} />);

      expect(container.firstChild).not.toBeNull();
   });

   it('renders ThemeColorProvider successfully', () => {
      const { container } = render(
         <ThemeColorProvider>
            <>Test</>
         </ThemeColorProvider>,
      );

      expect(container.firstChild).not.toBeNull();
   });

   it('renders PageWrapper successfully', () => {
      const { container } = render(
         <PageWrapper>
            <>Test</>
         </PageWrapper>,
      );

      expect(container.firstChild).not.toBeNull();
   });

   it('renders a fallback when a child throws during rendering', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const BrokenPage = () => {
         throw new Error('Page render failed');
      };

      try {
         const { getByRole } = render(
            <Architecture>
               <BrokenPage />
            </Architecture>,
         );

         expect(getByRole('alert').textContent).toContain('Something went wrong');
      } finally {
         consoleError.mockRestore();
      }
   });
});
