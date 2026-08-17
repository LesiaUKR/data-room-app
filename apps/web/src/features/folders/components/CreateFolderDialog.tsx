import { type CreateFolder, createFolderSchema } from '@data-room/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useFolderMutations } from '../hooks';
import { toFolderErrors } from '../utils/to-folder-error';

const NAME_FIELD_ID = 'create-folder-name';

type CreateFolderDialogProperties = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentFolderId: string;
};

const CreateFolderDialog = ({
  open,
  onOpenChange,
  parentFolderId,
}: CreateFolderDialogProperties): ReactElement => {
  const { create } = useFolderMutations(parentFolderId);

  const form = useForm<CreateFolder>({
    resolver: zodResolver(createFolderSchema),
    defaultValues: { parentFolderId, name: '' },
  });

  const { errors } = form.formState;

  const isNameEmpty = form.watch('name').trim().length === 0;

  useEffect(() => {
    if (open) {
      form.reset({ parentFolderId, name: '' });
    }
  }, [form, open, parentFolderId]);

  const handleSubmit = form.handleSubmit((values) => {
    create.mutate(
      { body: values },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
        onError: (error) => {
          for (const { field, message } of toFolderErrors(error)) {
            form.setError(field, { message });
          }
        },
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>
            The folder is created inside the one you are viewing.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor={NAME_FIELD_ID}>Name</Label>

            <Input
              id={NAME_FIELD_ID}
              autoComplete="off"
              placeholder="Folder name"
              aria-invalid={errors.name !== undefined}
              {...form.register('name')}
            />

            <div aria-live="polite">
              {errors.name === undefined ? null : (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
              {errors.root === undefined ? null : (
                <p className="text-sm text-destructive">{errors.root.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>

            <Button type="submit" size="lg" disabled={isNameEmpty || create.isPending}>
              {create.isPending ? 'Creating…' : 'Create folder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { CreateFolderDialog };
