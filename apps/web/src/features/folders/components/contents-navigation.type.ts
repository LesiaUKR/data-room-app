import { type MouseEventHandler, type ReactElement, type ReactNode } from 'react';

/** What a name cell hands upward so the page, not the table, decides the route. */
type NameLinkProperties = {
  id: string;
  children: ReactNode;
  className: string;
  onClick: MouseEventHandler<HTMLAnchorElement>;
};

type NameLinkRenderer = (properties: NameLinkProperties) => ReactElement;

/** Every transition the contents table can trigger, so the table itself names no route. */
type ContentsNavigation = {
  renderFolderLink: NameLinkRenderer;
  renderFileLink: NameLinkRenderer;
  openFolder: (folderId: string) => void;
  openFileInNewTab: (fileId: string) => void;
};

export { type ContentsNavigation, type NameLinkProperties, type NameLinkRenderer };
