const REDACTED = '[REDACTED]';

const SECRET_PATTERNS: [RegExp, string][] = [
  [/(\bauthorization\s*:\s*)[^\n\r]+/gi, `$1${REDACTED}`],
  [/(\bset-cookie\s*:\s*)[^\n\r]+/gi, `$1${REDACTED}`],
  [/(\bcookie\s*:\s*)[^\n\r]+/gi, `$1${REDACTED}`],
  [/\bbearer\s+[\w.~+/-]+=*/gi, `Bearer ${REDACTED}`],
  [/(:\/\/)[^/\s:@]+:[^/\s@]+@/g, `$1${REDACTED}@`],
  // Whole remainder, not one segment: `/public/share/<token>` would keep the token.
  [/(\/(?:public|share)\/)[^\s"'<>()]+/gi, `$1${REDACTED}`],
  [/(\bhttps?:\/\/[^\s"'<>()]+?)\?[^\s"'<>()]*/gi, `$1?${REDACTED}`],
];

const sanitizeSecrets = (text: string): string =>
  SECRET_PATTERNS.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    text,
  );

export { sanitizeSecrets };
