import { Check, Copy } from 'lucide-react';
import { useEffect, useState, type ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const FEEDBACK_MS = 2000;

const COPY_FAILED_MESSAGE = 'Clipboard access was blocked. Select and copy the address manually.';

type CopyButtonProperties = {
  value: string;
  label: string;
  size?: 'sm' | 'lg';
};

const CopyButton = ({ value, label, size = 'sm' }: CopyButtonProperties): ReactElement => {
  const [state, setState] = useState<'copied' | 'failed' | 'idle'>('idle');

  useEffect(() => {
    if (state !== 'copied') {
      return;
    }

    const timer = globalThis.setTimeout(() => setState('idle'), FEEDBACK_MS);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [state]);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      // Clipboard access is refused outside a secure context or without permission
      setState('failed');
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size={size}
        aria-label={label}
        onClick={() => {
          void copy();
        }}
      >
        {state === 'copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {state === 'copied' ? 'Copied' : 'Copy'}
      </Button>

      <div aria-live="polite" className="flex flex-col items-end gap-1">
        {state === 'failed' ? (
          <>
            <p className="max-w-64 text-right text-xs text-destructive">{COPY_FAILED_MESSAGE}</p>
            <Input
              readOnly
              value={value}
              aria-label="Address to copy manually"
              className="w-64 max-w-[60vw] font-mono text-xs"
              onFocus={(event) => event.currentTarget.select()}
            />
          </>
        ) : null}
      </div>
    </div>
  );
};

export { CopyButton };
