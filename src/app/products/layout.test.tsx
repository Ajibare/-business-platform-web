import { render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import ProductsLayout from './layout';

jest.mock('@/components/guards/auth-guard', () => ({
  AuthGuard: ({ children }: { children: ReactNode }) => (
    <div data-testid="auth-guard">{children}</div>
  ),
}));

jest.mock('@/components/layouts/app-shell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

/**
 * The regression this guards: the product routes sat outside `(platform)` and
 * rendered with no sidebar or header at all.
 */
describe('ProductsLayout', () => {
  it('renders product screens inside the shared dashboard shell', () => {
    render(
      <ProductsLayout>
        <p>products</p>
      </ProductsLayout>,
    );

    const shell = screen.getByTestId('app-shell');
    expect(shell).toContainElement(screen.getByText('products'));
    expect(screen.getByTestId('auth-guard')).toContainElement(shell);
  });
});
