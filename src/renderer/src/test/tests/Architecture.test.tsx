import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { router } from '../../router';
import { RouterProvider } from 'react-router-dom';
import MainWrapper from '../../architecture/MainWrapper';
import PageWrapper from '../../architecture/PageWrapper';
import Provider from '../../architecture/Provider';

describe('Architecture', () => {
   it('renders router provider successfully', () => {
      const { container } = render(<RouterProvider router={router} />);

      expect(container.firstChild).not.toBeNull();
   });

   it('renders Provider successfully', () => {
      const { container } = render(
         <Provider>
            <>Test</>
         </Provider>,
      );

      expect(container.firstChild).not.toBeNull();
   });

   it('renders MainWrapper successfully', () => {
      const { container } = render(<MainWrapper />);

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
});
