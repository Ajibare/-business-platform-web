import { ReactNode } from 'react';
import { AuthGuard } from '@/components/guards/auth-guard';

/**
 * Every product screen needs a signed-in membership. These routes sit outside
 * `(platform)`, so without this layout they rendered for anyone and then failed
 * every request behind them.
 */
export default function ProductsLayout({ children }: { children: ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
