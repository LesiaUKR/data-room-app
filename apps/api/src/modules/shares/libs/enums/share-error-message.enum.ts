const ShareErrorMessage = {
  NOT_FOUND: 'Share not found.',
  RECIPIENT_NOT_FOUND: 'No registered user has that email address.',
  SELF_SHARE_NOT_ALLOWED: 'You already have access to this resource.',
  INVALID_CURSOR: 'The pagination cursor is not valid.',
  CREATE_EXHAUSTED: 'Could not create the share. Please try again.',
  RACE: 'A concurrent request took the grant slot.',
} as const;

type ShareErrorMessage = (typeof ShareErrorMessage)[keyof typeof ShareErrorMessage];

export { ShareErrorMessage };
