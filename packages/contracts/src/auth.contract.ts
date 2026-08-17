import { initContract } from '@ts-rest/core';
import { z } from 'zod';

import { errorResponseSchema } from './error-response.schema.js';

const c = initContract();

const EMAIL_MAX_LENGTH = 320;
const PASSWORD_MIN_LENGTH = 10;
// Printable ASCII keeps one character equal to one byte, so bcrypt's 72-byte cutoff is unreachable
const PASSWORD_MAX_LENGTH = 64;

const LOWERCASE_PATTERN = /[a-z]/;
const UPPERCASE_PATTERN = /[A-Z]/;
const DIGIT_PATTERN = /\d/;
const SPECIAL_PATTERN = /[!-/:-@[-`{-~]/;
const PRINTABLE_ASCII_PATTERN = /^[!-~]+$/;

const passwordPolicy = {
  minLength: PASSWORD_MIN_LENGTH,
  maxLength: PASSWORD_MAX_LENGTH,
} as const;

const passwordRules = [
  {
    id: 'minLength',
    message: `At least ${PASSWORD_MIN_LENGTH} characters`,
    showInChecklist: true,
    test: (value: string): boolean => value.length >= PASSWORD_MIN_LENGTH,
  },
  // Enforced server-side only: the input caps typing, so the checklist never shows a ceiling
  {
    id: 'maxLength',
    message: `No more than ${PASSWORD_MAX_LENGTH} characters`,
    showInChecklist: false,
    test: (value: string): boolean => value.length <= PASSWORD_MAX_LENGTH,
  },
  {
    id: 'lowercase',
    message: 'At least one lowercase letter (a-z)',
    showInChecklist: true,
    test: (value: string): boolean => LOWERCASE_PATTERN.test(value),
  },
  {
    id: 'uppercase',
    message: 'At least one uppercase letter (A-Z)',
    showInChecklist: true,
    test: (value: string): boolean => UPPERCASE_PATTERN.test(value),
  },
  {
    id: 'digit',
    message: 'At least one digit (0-9)',
    showInChecklist: true,
    test: (value: string): boolean => DIGIT_PATTERN.test(value),
  },
  {
    id: 'special',
    message: 'At least one special character (! @ # $ % ...)',
    showInChecklist: true,
    test: (value: string): boolean => SPECIAL_PATTERN.test(value),
  },
  {
    id: 'charset',
    message: 'Latin letters, digits and special characters only - no spaces or emoji',
    showInChecklist: true,
    test: (value: string): boolean => PRINTABLE_ASCII_PATTERN.test(value),
  },
] as const;

type PasswordRuleId = (typeof passwordRules)[number]['id'];

type PasswordRuleState = {
  id: PasswordRuleId;
  message: string;
  passed: boolean;
  showInChecklist: boolean;
};

// Single source for the API check and the live checklist in the sign-up form
const evaluatePasswordRules = (value: string): PasswordRuleState[] =>
  passwordRules.map((rule) => ({
    id: rule.id,
    message: rule.message,
    passed: rule.test(value),
    showInChecklist: rule.showInChecklist,
  }));

// `.trim()` runs before `.email()`, so a pasted trailing space is cleaned, not rejected
const emailSchema = z.string().trim().max(EMAIL_MAX_LENGTH).email();

// superRefine reports every unmet rule at once; chained .refine would stop at the first
const passwordSchema = z.string().superRefine((value, ctx) => {
  for (const rule of passwordRules) {
    if (!rule.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: rule.message,
        params: { rule: rule.id },
      });
    }
  }
});

const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Sign-in checks credentials, never the policy: tightening the rules must not lock out an
// account whose existing password was valid when it was created
const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

const sessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
});

// rootFolderId is resolved by query, not stored on the data room - see the Issue 03 schema
const sessionDataRoomSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  rootFolderId: z.string().uuid(),
});

const sessionResponseSchema = z.object({
  user: sessionUserSchema,
  dataRoom: sessionDataRoomSchema,
});

const authContract = c.router({
  signUp: {
    method: 'POST',
    path: '/auth/sign-up',
    summary: 'Register a user with their own data room and root folder',
    body: credentialsSchema,
    responses: {
      201: sessionResponseSchema,
      400: errorResponseSchema,
      409: errorResponseSchema,
      413: errorResponseSchema,
      422: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
  signIn: {
    method: 'POST',
    path: '/auth/sign-in',
    summary: 'Exchange credentials for a session cookie',
    body: signInSchema,
    responses: {
      200: sessionResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
      413: errorResponseSchema,
      422: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
  signOut: {
    method: 'POST',
    path: '/auth/sign-out',
    summary: 'Clear the session cookie; safe to call without a session',
    body: c.noBody(),
    responses: {
      204: c.noBody(),
      500: errorResponseSchema,
    },
  },
  me: {
    method: 'GET',
    path: '/auth/me',
    summary: 'Restore the session of the authenticated actor',
    responses: {
      200: sessionResponseSchema,
      401: errorResponseSchema,
      500: errorResponseSchema,
    },
  },
});

type Credentials = z.infer<typeof credentialsSchema>;
type SignInCredentials = z.infer<typeof signInSchema>;
type SessionResponse = z.infer<typeof sessionResponseSchema>;
type SessionUser = z.infer<typeof sessionUserSchema>;
type SessionDataRoom = z.infer<typeof sessionDataRoomSchema>;

export {
  authContract,
  credentialsSchema,
  evaluatePasswordRules,
  passwordRules,
  sessionDataRoomSchema,
  sessionResponseSchema,
  passwordPolicy,
  passwordSchema,
  sessionUserSchema,
  signInSchema,
  type Credentials,
  type PasswordRuleId,
  type PasswordRuleState,
  type SessionDataRoom,
  type SessionResponse,
  type SessionUser,
  type SignInCredentials,
};
