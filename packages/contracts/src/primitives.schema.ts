import { z } from 'zod';

// Characters, not code units: VARCHAR(255) counts characters and "😀".length is 2
const RESOURCE_NAME_MAX_CHARACTERS = 255;

// Allowlist: emoji, zero-width, bidi-control and <>:"/\|?* are excluded by not being listed
const ALLOWED_NAME_PATTERN = /^[\p{L}\p{M}\p{N}\p{Pd} _.,()[\]'’&]+$/u;

const WINDOWS_RESERVED_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

const countCharacters = (value: string): number => [...value].length;

const baseNameOf = (value: string): string => (value.split('.')[0] ?? '').toUpperCase();

/** One naming rule for every user-named resource, so folders and files cannot drift apart. */
const resourceNameSchema = z
  .string()
  .trim()
  .transform((value) =>
    value
      .normalize('NFC')
      .replace(/\p{Zs}+/gu, ' ')
      .trim(),
  )
  .refine((value) => value.length > 0, { message: 'Name is required' })
  .refine((value) => countCharacters(value) <= RESOURCE_NAME_MAX_CHARACTERS, {
    message: `Name cannot be longer than ${RESOURCE_NAME_MAX_CHARACTERS} characters`,
  })
  .refine((value) => ALLOWED_NAME_PATTERN.test(value), {
    message:
      "Name may contain letters, digits, spaces and - _ . , ( ) [ ] ' & only - no emoji or invisible characters",
  })
  .refine((value) => !value.startsWith('.'), { message: 'Name cannot start with a dot' })
  .refine((value) => !value.endsWith('.'), { message: 'Name cannot end with a dot' })
  .refine((value) => !WINDOWS_RESERVED_NAMES.has(baseNameOf(value)), {
    message: 'This name is reserved by the operating system',
  });

// Decimal string: JSON.stringify throws on BigInt, and SUM(bigint) returns NUMERIC anyway
const byteCountSchema = z.string().regex(/^\d+$/);

export { byteCountSchema, RESOURCE_NAME_MAX_CHARACTERS, resourceNameSchema };
