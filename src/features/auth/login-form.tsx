'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/services/api';
import { useAuth } from '@/hooks/use-auth';
import { AuthTokens } from '@/types/api';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      const tokens: AuthTokens = await apiFetch<AuthTokens>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      signIn(tokens);
      router.push('/dashboard');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to sign in');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <input
          {...register('email')}
          type="email"
          placeholder="Email"
          className="flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink"
        />
        {errors.email ? <p className="text-sm text-danger">{errors.email.message}</p> : null}
      </div>
      <div className="space-y-2">
        <input
          {...register('password')}
          type="password"
          placeholder="Password"
          className="flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink"
        />
        {errors.password ? <p className="text-sm text-danger">{errors.password.message}</p> : null}
      </div>
      {formError ? <p className="text-sm text-danger">{formError}</p> : null}
      <button
        type="submit"
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary-600 text-sm font-medium text-white transition-colors hover:bg-primary-700"
      >
        Sign in
      </button>
    </form>
  );
}
