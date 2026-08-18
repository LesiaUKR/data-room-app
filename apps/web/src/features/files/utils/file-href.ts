const FILE_ROUTE_PREFIX = '/files';

/** The viewer lives at its own URL, so a row can open it in a new tab like any link. */
const fileHref = (fileId: string): string => `${FILE_ROUTE_PREFIX}/${fileId}`;

const openFileInNewTab = (fileId: string): void => {
  globalThis.open(fileHref(fileId), '_blank', 'noopener');
};

export { fileHref, openFileInNewTab };
