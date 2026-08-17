import { type ReactElement, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ConfirmDialogProperties = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  isPending: boolean;
  isConfirmDisabled?: boolean;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
};

const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel,
  isPending,
  isConfirmDisabled = false,
  variant = 'default',
  onConfirm,
}: ConfirmDialogProperties): ReactElement => (
  <Dialog
    open={open}
    onOpenChange={(next) => {
      if (isPending && !next) {
        return;
      }

      onOpenChange(next);
    }}
  >
    <DialogContent
      showCloseButton={!isPending}
      onEscapeKeyDown={(event) => {
        if (isPending) {
          event.preventDefault();
        }
      }}
      onInteractOutside={(event) => {
        if (isPending) {
          event.preventDefault();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription asChild>
          <div>{description}</div>
        </DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={isPending}
          onClick={() => {
            onOpenChange(false);
          }}
        >
          Cancel
        </Button>

        <Button
          type="button"
          size="lg"
          variant={variant === 'destructive' ? 'destructive' : 'default'}
          disabled={isPending || isConfirmDisabled}
          onClick={onConfirm}
        >
          {isPending ? pendingLabel : confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export { ConfirmDialog };
