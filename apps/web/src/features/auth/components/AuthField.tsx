import { Eye, EyeOff } from 'lucide-react';
import { type ReactElement, type ReactNode, useId, useState } from 'react';
import { type UseFormRegisterReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AuthFieldProperties = {
  autoComplete: string;
  children?: ReactNode;
  error: string | undefined;
  label: string;
  maxLength?: number;
  placeholder?: string;
  registration: UseFormRegisterReturn;
  revealable?: boolean;
  type: 'email' | 'password';
};

const AuthField = ({
  autoComplete,
  children,
  error,
  label,
  maxLength,
  placeholder,
  registration,
  revealable = false,
  type,
}: AuthFieldProperties): ReactElement => {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const [isRevealed, setIsRevealed] = useState(false);

  const inputType = revealable && isRevealed ? 'text' : type;

  // A screen reader has to hear the rules and the error, not just the label
  const describedBy = [children === undefined ? null : hintId, error === undefined ? null : errorId]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative">
        <Input
          {...registration}
          id={inputId}
          type={inputType}
          autoComplete={autoComplete}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-invalid={error !== undefined}
          aria-describedby={describedBy === '' ? undefined : describedBy}
          className={revealable ? 'pr-9' : undefined}
        />
        {revealable ? (
          <button
            type="button"
            onClick={() => {
              setIsRevealed((current) => !current);
            }}
            aria-label={isRevealed ? 'Hide password' : 'Show password'}
            aria-pressed={isRevealed}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 flex items-center rounded-r-lg px-2.5 outline-none focus-visible:ring-3"
          >
            {isRevealed ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        ) : null}
      </div>
      {children === undefined ? null : <div id={hintId}>{children}</div>}
      {error === undefined ? null : (
        <p id={errorId} className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export { AuthField };
