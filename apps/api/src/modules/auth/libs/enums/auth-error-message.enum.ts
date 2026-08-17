const AuthErrorMessage = {
  EMAIL_ALREADY_IN_USE: 'This email is already registered.',
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  SESSION_REQUIRED: 'Authentication is required.',
} as const;

type AuthErrorMessage = (typeof AuthErrorMessage)[keyof typeof AuthErrorMessage];

export { AuthErrorMessage };
