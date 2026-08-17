import { evaluatePasswordRules } from '@data-room/contracts';
import { Check, X } from 'lucide-react';
import { type ReactElement } from 'react';

import { cn } from '@/lib/utils';

type PasswordChecklistProperties = {
  value: string;
};

const PasswordChecklist = ({ value }: PasswordChecklistProperties): ReactElement => {
  const rules = evaluatePasswordRules(value).filter((rule) => rule.showInChecklist);

  return (
    <ul
      className="space-y-1 pt-1"
      aria-label="Password requirements"
      aria-live="polite"
      aria-atomic="false"
    >
      {rules.map((rule) => (
        <li
          key={rule.id}
          className={cn(
            'flex items-center gap-2 text-xs transition-colors',
            rule.passed ? 'text-success font-medium' : 'text-muted-foreground',
          )}
        >
          {rule.passed ? (
            <Check className="size-3.5 shrink-0" strokeWidth={3} aria-hidden />
          ) : (
            <X className="size-3.5 shrink-0" aria-hidden />
          )}
          <span>{rule.message}</span>
          <span className="sr-only">{rule.passed ? '— done' : '— not met yet'}</span>
        </li>
      ))}
    </ul>
  );
};

export { PasswordChecklist };
