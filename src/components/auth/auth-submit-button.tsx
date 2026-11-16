'use client';

import { Loader2 } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AuthSubmitButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingLabel?: string;
}

/**
 * 48px primary action. While a request is in flight it is disabled and shows a
 * spinner with an `aria-busy` state, so the form can never be submitted twice
 * by an impatient double tap.
 */
export function AuthSubmitButton({
  isLoading = false,
  loadingLabel = 'Please wait…',
  children,
  className,
  disabled,
  ...props
}: AuthSubmitButtonProps) {
  return (
    <Button
      type="submit"
      size="lg"
      className={cn('w-full', className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
