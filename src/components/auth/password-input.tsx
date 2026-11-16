'use client';

import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AuthInput, AuthInputProps } from './auth-input';

export type PasswordInputProps = Omit<AuthInputProps, 'type' | 'trailing'>;

/**
 * Password field with a show/hide control. The toggle is a real button with an
 * `aria-pressed` state and a label, so it works from the keyboard and is
 * announced correctly.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(props, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <AuthInput
        {...props}
        ref={ref}
        type={visible ? 'text' : 'password'}
        autoComplete={props.autoComplete ?? 'current-password'}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
          >
            {visible ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        }
      />
    );
  },
);
