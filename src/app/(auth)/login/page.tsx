import { AuthLayout } from '@/components/layouts/auth-layout';
import { LoginForm } from '@/features/auth/login-form';

export default function LoginPage() {
  return (
    <AuthLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-ink">Sign in</h1>
        <LoginForm />
      </div>
    </AuthLayout>
  );
}
