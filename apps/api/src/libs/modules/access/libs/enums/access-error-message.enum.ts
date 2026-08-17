const AccessErrorMessage = {
  ACTION_NOT_ALLOWED: 'You do not have permission to perform this action.',
} as const;

type AccessErrorMessage = (typeof AccessErrorMessage)[keyof typeof AccessErrorMessage];

export { AccessErrorMessage };
