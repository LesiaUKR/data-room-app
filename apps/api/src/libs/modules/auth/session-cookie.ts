import { type CookieOptions } from 'express';

import { config } from '../config/index.js';
import { SESSION_TTL_SECONDS } from './auth.js';

const MILLISECONDS_PER_SECOND = 1000;

const SESSION_COOKIE_NAME = 'session';

const COOKIE_SEPARATOR = ';';
const NAME_VALUE_SEPARATOR = '=';

// `Secure` is dropped by browsers over plain HTTP, which is exactly what local development uses
const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProduction,
  path: '/',
};

const sessionCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  maxAge: SESSION_TTL_SECONDS * MILLISECONDS_PER_SECOND,
};

// Clearing only works when the attributes match the ones the cookie was set with
const clearedSessionCookieOptions: CookieOptions = baseCookieOptions;

/** Express 4 does not parse cookies, and one known name does not justify a parser dependency. */
const readSessionToken = (cookieHeader: string | undefined): string | null => {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(COOKIE_SEPARATOR)) {
    const separatorIndex = part.indexOf(NAME_VALUE_SEPARATOR);

    if (separatorIndex === -1) {
      continue;
    }

    if (part.slice(0, separatorIndex).trim() === SESSION_COOKIE_NAME) {
      const rawValue = part.slice(separatorIndex + 1).trim();

      try {
        return decodeURIComponent(rawValue);
      } catch {
        // A client-supplied cookie like `session=%` must read as "no session", not as a 500
        return null;
      }
    }
  }

  return null;
};

export { clearedSessionCookieOptions, readSessionToken, SESSION_COOKIE_NAME, sessionCookieOptions };
