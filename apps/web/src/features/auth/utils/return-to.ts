const DEFAULT_RETURN_TO = '/';

// Returning to an auth screen would bounce the user straight back out of it
const AUTH_PATHS = ['/sign-in', '/sign-up'];

const pathnameOf = (path: string): string => path.split(/[?#]/)[0] ?? path;

/**
 * Router navigation by `href` accepts external targets by design, so a value read from the URL
 * must be narrowed to an internal path here or it becomes an open redirect.
 */
const toInternalPath = (value: unknown): string => {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return DEFAULT_RETURN_TO;
  }

  // `//host` and `/\host` are protocol-relative: a browser reads them as another origin
  if (value.startsWith('//') || value.startsWith('/\\')) {
    return DEFAULT_RETURN_TO;
  }

  return AUTH_PATHS.includes(pathnameOf(value)) ? DEFAULT_RETURN_TO : value;
};

export { toInternalPath };
