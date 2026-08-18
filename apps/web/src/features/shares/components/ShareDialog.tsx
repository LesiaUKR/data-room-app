import {
  emailSchema,
  ResourceKind,
  ShareType,
  type Share,
  type ShareTarget,
  type ShareTargetView,
} from '@data-room/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useShareMutations, useShares } from '../hooks';
import { toShareErrors, toShareFailure, type ShareFailure } from '../utils/to-share-error';
import { useShareUrl } from '../utils/use-share-url';
import { CopyButton } from './CopyButton';

const EMAIL_FIELD_ID = 'share-recipient-email';

const ALREADY_HAS_ACCESS_MESSAGE = 'This user already has access.';

const TOKEN_ONCE_MESSAGE =
  'For security, this URL was shown only when the link was created. Revoke it and create a new link if you no longer have it.';

const ACCESS_NOTE: Record<ResourceKind, string> = {
  [ResourceKind.DATA_ROOM]:
    'Recipients get read-only access to this data room and everything inside it.',
  [ResourceKind.FOLDER]: 'Recipients get read-only access to this folder and everything inside it.',
  [ResourceKind.FILE]: 'Recipients get read-only access to this document.',
};

const recipientFormSchema = z.object({ recipientEmail: emailSchema });

type RecipientForm = z.infer<typeof recipientFormSchema>;

const formatCreatedAt = (value: string): string =>
  new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

type ShareDialogProperties = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ShareTarget;
  resourceName: string;
};

const ShareDialog = ({
  open,
  onOpenChange,
  target,
  resourceName,
}: ShareDialogProperties): ReactElement => {
  const shares = useShares(target, open);
  const { create, revoke } = useShareMutations(target);
  const { publicLinkUrl, recipientUrl } = useShareUrl();

  // The plaintext token exists only in the response that created it, so the URL is held here
  const [createdLink, setCreatedLink] = useState<{ shareId: string; url: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [publicError, setPublicError] = useState<string | null>(null);
  const [revokeConfirmationId, setRevokeConfirmationId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const form = useForm<RecipientForm>({
    resolver: zodResolver(recipientFormSchema),
    defaultValues: { recipientEmail: '' },
  });

  const { errors } = form.formState;

  useEffect(() => {
    if (open) {
      setCreatedLink(null);
      setNotice(null);
      setPublicError(null);
      setRevokeConfirmationId(null);
      setRevokingId(null);
      form.reset({ recipientEmail: '' });
    }
  }, [form, open]);

  const items =
    shares.data?.pages.flatMap((page) => (page.status === 200 ? page.body.items : [])) ?? [];

  const publicLinks = items.filter((item) => item.type === ShareType.PUBLIC_LINK);
  const userGrants = items.filter((item) => item.type === ShareType.USER);

  // The freshly created link is shown as its own block, so it must not repeat as a plain row
  const listedPublicLinks = publicLinks.filter((item) => item.id !== createdLink?.shareId);

  const reportError = (error: unknown): void => {
    for (const { field, message } of toShareErrors(error)) {
      form.setError(field, { message });
    }
  };

  const reportPublicError = (error: unknown): void => {
    setPublicError(toShareErrors(error)[0]?.message ?? 'Something went wrong. Please try again.');
  };

  const createPublicLink = (): void => {
    setNotice(null);
    setPublicError(null);

    create.mutate(
      { body: { type: ShareType.PUBLIC_LINK, target } },
      {
        onSuccess: (response) => {
          if (response.body.token !== null) {
            setCreatedLink({
              shareId: response.body.share.id,
              url: publicLinkUrl(response.body.token),
            });
          }
        },
        onError: reportPublicError,
      },
    );
  };

  const handleSubmit = form.handleSubmit((values) => {
    setNotice(null);

    create.mutate(
      { body: { type: ShareType.USER, target, recipientEmail: values.recipientEmail } },
      {
        onSuccess: (response) => {
          // 200 means the grant was already there - nothing failed, nothing new was created
          if (response.status === 200) {
            setNotice(ALREADY_HAS_ACCESS_MESSAGE);
          }

          form.reset({ recipientEmail: '' });
        },
        onError: reportError,
      },
    );
  });

  const revokeGrant = (shareId: string, scope: 'public' | 'user'): void => {
    setRevokingId(shareId);

    if (scope === 'public') {
      setPublicError(null);
    } else {
      form.clearErrors();
    }

    revoke.mutate(
      { params: { shareId } },
      {
        onSuccess: () => {
          if (createdLink?.shareId === shareId) {
            setCreatedLink(null);
          }
        },
        onError: scope === 'public' ? reportPublicError : reportError,
        onSettled: () => {
          setRevokeConfirmationId(null);
          setRevokingId(null);
        },
      },
    );
  };

  const failedPage = shares.data?.pages.find((page) => page.status !== 200);
  const failureValue = shares.isError ? shares.error : failedPage;
  const failure = failureValue === undefined ? null : toShareFailure(failureValue);
  const isEmailEmpty = form.watch('recipientEmail').trim().length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 flex max-h-[calc(100dvh-2rem)] translate-y-0 flex-col overflow-hidden sm:top-[8dvh] sm:max-h-[calc(92dvh-1rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate">Share “{resourceName}”</DialogTitle>
          <DialogDescription>{ACCESS_NOTE[target.kind]}</DialogDescription>
        </DialogHeader>

        {/* The top edge stays fixed while async content grows naturally downwards */}
        <div className="scroll-slim -mx-1 flex min-h-0 flex-col gap-6 overflow-y-auto px-1 [scrollbar-gutter:stable]">
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Public link</h3>

            {createdLink === null ? null : (
              <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-start gap-2">
                  <Input
                    readOnly
                    value={createdLink.url}
                    aria-label="Public link address"
                    className="font-mono text-xs"
                    onFocus={(event) => event.currentTarget.select()}
                  />

                  <CopyButton value={createdLink.url} label="Copy the public link" />
                </div>

                <p className="text-xs text-muted-foreground">
                  Copy it now — for security this address is shown only once.
                </p>

                <div className="flex justify-end">
                  <RevokeControls
                    isConfirming={revokeConfirmationId === createdLink.shareId}
                    isRevoking={revokingId === createdLink.shareId}
                    revokeInProgress={revokingId !== null}
                    onRequest={() => setRevokeConfirmationId(createdLink.shareId)}
                    onCancel={() => setRevokeConfirmationId(null)}
                    onConfirm={() => revokeGrant(createdLink.shareId, 'public')}
                  />
                </div>
              </div>
            )}

            {publicError === null ? null : (
              <p role="alert" className="text-sm text-destructive">
                {publicError}
              </p>
            )}

            {shares.isPending ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                Loading public links…
              </p>
            ) : failure === null ? (
              <>
                {listedPublicLinks.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm">Public link</p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatCreatedAt(share.createdAt)}
                      </p>
                    </div>

                    <RevokeControls
                      isConfirming={revokeConfirmationId === share.id}
                      isRevoking={revokingId === share.id}
                      revokeInProgress={revokingId !== null}
                      onRequest={() => setRevokeConfirmationId(share.id)}
                      onCancel={() => setRevokeConfirmationId(null)}
                      onConfirm={() => revokeGrant(share.id, 'public')}
                    />
                  </div>
                ))}

                {listedPublicLinks.length > 0 ? (
                  <p className="text-xs text-muted-foreground">{TOKEN_ONCE_MESSAGE}</p>
                ) : null}

                {publicLinks.length === 0 && createdLink === null ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={create.isPending}
                    onClick={createPublicLink}
                  >
                    {create.isPending ? 'Creating…' : 'Create public link'}
                  </Button>
                ) : null}
              </>
            ) : (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-destructive">
                  {failure === 'forbidden' || failure === 'missing'
                    ? 'You do not have access to the sharing settings of this item.'
                    : 'We could not load public links.'}
                </span>

                {failure === 'forbidden' || failure === 'missing' ? null : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={shares.isRefetching}
                    onClick={() => void shares.refetch()}
                  >
                    {shares.isRefetching ? 'Retrying…' : 'Try again'}
                  </Button>
                )}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">People with access</h3>

            <form
              onSubmit={(event) => {
                void handleSubmit(event);
              }}
              className="flex flex-col gap-2"
              noValidate
            >
              <Label htmlFor={EMAIL_FIELD_ID}>Share with a registered user</Label>

              <div className="flex items-start gap-2">
                <Input
                  id={EMAIL_FIELD_ID}
                  type="email"
                  autoComplete="off"
                  placeholder="name@example.com"
                  aria-invalid={errors.recipientEmail !== undefined}
                  {...form.register('recipientEmail')}
                />

                <Button type="submit" disabled={isEmailEmpty || create.isPending}>
                  {create.isPending ? 'Sharing…' : 'Share'}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                They must already have an account. Enter the address they signed up with — we cannot
                suggest addresses, because that would expose everyone registered here.
              </p>

              <div aria-live="polite">
                {errors.recipientEmail === undefined ? null : (
                  <p className="text-sm text-destructive">{errors.recipientEmail.message}</p>
                )}
                {errors.root === undefined ? null : (
                  <p className="text-sm text-destructive">{errors.root.message}</p>
                )}
                {notice === null ? null : <p className="text-sm text-muted-foreground">{notice}</p>}
              </div>
            </form>

            <GrantList
              grants={userGrants}
              isPending={shares.isPending}
              failure={failure}
              isRetrying={shares.isRefetching}
              revokingId={revokingId}
              revokeConfirmationId={revokeConfirmationId}
              onRetry={() => void shares.refetch()}
              onRequestRevoke={setRevokeConfirmationId}
              onCancelRevoke={() => setRevokeConfirmationId(null)}
              onConfirmRevoke={(shareId) => revokeGrant(shareId, 'user')}
              buildUrl={recipientUrl}
            />

            {shares.hasNextPage ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={shares.isFetchingNextPage}
                onClick={() => void shares.fetchNextPage()}
              >
                {shares.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Button>
            ) : null}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

type GrantListProperties = {
  grants: Share[];
  isPending: boolean;
  failure: ShareFailure | null;
  isRetrying: boolean;
  revokingId: string | null;
  revokeConfirmationId: string | null;
  onRetry: () => void;
  onRequestRevoke: (shareId: string) => void;
  onCancelRevoke: () => void;
  onConfirmRevoke: (shareId: string) => void;
  buildUrl: (target: ShareTargetView) => string;
};

const GrantList = ({
  grants,
  isPending,
  failure,
  isRetrying,
  revokingId,
  revokeConfirmationId,
  onRetry,
  onRequestRevoke,
  onCancelRevoke,
  onConfirmRevoke,
  buildUrl,
}: GrantListProperties): ReactElement => {
  if (isPending) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle
          className="size-4 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        Loading people…
      </p>
    );
  }

  if (failure !== null) {
    const isTerminal = failure === 'forbidden' || failure === 'missing';

    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-destructive">
          {isTerminal
            ? 'You do not have access to the sharing settings of this item.'
            : 'We could not load who has access.'}
        </span>

        {/* A single failed read left the list dead until the dialog was reopened */}
        {isTerminal ? null : (
          <Button type="button" variant="outline" size="sm" disabled={isRetrying} onClick={onRetry}>
            {isRetrying ? 'Retrying…' : 'Try again'}
          </Button>
        )}
      </div>
    );
  }

  if (grants.length === 0) {
    return <p className="text-sm text-muted-foreground">No one has been given access yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {grants.map((grant) => (
        <li
          key={grant.id}
          className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-sm">{grant.recipientEmail}</p>
            <p className="text-xs text-muted-foreground">
              Added {formatCreatedAt(grant.createdAt)}
            </p>
          </div>

          <div className="flex shrink-0 items-start gap-2">
            <CopyButton
              value={buildUrl(grant.target)}
              label={`Copy the link for ${grant.recipientEmail}`}
            />

            <RevokeControls
              isConfirming={revokeConfirmationId === grant.id}
              isRevoking={revokingId === grant.id}
              revokeInProgress={revokingId !== null}
              onRequest={() => onRequestRevoke(grant.id)}
              onCancel={onCancelRevoke}
              onConfirm={() => onConfirmRevoke(grant.id)}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

type RevokeControlsProperties = {
  isConfirming: boolean;
  isRevoking: boolean;
  revokeInProgress: boolean;
  onRequest: () => void;
  onCancel: () => void;
  onConfirm: () => void;
};

const RevokeControls = ({
  isConfirming,
  isRevoking,
  revokeInProgress,
  onRequest,
  onCancel,
  onConfirm,
}: RevokeControlsProperties): ReactElement => {
  if (!isConfirming) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={revokeInProgress}
        onClick={onRequest}
      >
        Revoke
      </Button>
    );
  }

  return (
    <div role="group" aria-label="Confirm revoke access" className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="sm" disabled={isRevoking} onClick={onCancel}>
        Cancel
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={isRevoking}
        onClick={onConfirm}
      >
        {isRevoking ? 'Revoking…' : 'Confirm revoke'}
      </Button>
    </div>
  );
};

export { ShareDialog };
