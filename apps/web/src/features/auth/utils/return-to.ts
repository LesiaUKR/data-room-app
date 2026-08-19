const DEFAULT_RETURN_TO = '/';

// Returning to an auth screen would bounce the user straight back out of it
const AUTH_PATHS = ['/sign-in', '/sign-up'];

const pathnameOf = (path: string): string => path.split(/[?#]/)[0] ?? path;

// `href` navigation accepts external targets, so an unvalidated value is an open redirect
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

export { DEFAULT_RETURN_TO, toInternalPath };
