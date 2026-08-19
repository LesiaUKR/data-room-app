import { ResourceKind, type ShareTargetView } from '@data-room/contracts';
import { useRouter } from '@tanstack/react-router';
import { useCallback } from 'react';

type ShareUrlBuilders = {
  publicLinkUrl: (token: string) => string;
  recipientUrl: (target: ShareTargetView) => string;
};

// Path from the router so a rename breaks the build; origin from the browser
const useShareUrl = (): ShareUrlBuilders => {
  const router = useRouter();

  const toAbsolute = useCallback(
    (href: string): string => new URL(href, globalThis.location.origin).toString(),
    [],
  );

  const publicLinkUrl = useCallback(
    (token: string): string =>
      toAbsolute(router.buildLocation({ to: '/share/$token', params: { token } }).href),
    [router, toAbsolute],
  );

  // A registered recipient signs in and reads the resource through their own session, so their
  // link is an ordinary in-app URL - never the public-link route
  const recipientUrl = useCallback(
    (target: ShareTargetView): string => {
      if (target.kind === ResourceKind.FILE) {
        return toAbsolute(
          router.buildLocation({ to: '/files/$fileId', params: { fileId: target.id } }).href,
        );
      }

      const folderId = target.kind === ResourceKind.DATA_ROOM ? target.rootFolderId : target.id;

      return toAbsolute(
        router.buildLocation({ to: '/folders/$folderId', params: { folderId } }).href,
      );
    },
    [router, toAbsolute],
  );

  return { publicLinkUrl, recipientUrl };
};

export { useShareUrl };
