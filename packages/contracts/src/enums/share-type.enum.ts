/**
 * How a grant identifies its recipient: an unguessable link token (stored hashed) or a
 * specific signed-in user.
 */
const ShareType = {
  PUBLIC_LINK: 'PUBLIC_LINK',
  USER: 'USER',
} as const;

type ShareType = (typeof ShareType)[keyof typeof ShareType];

export { ShareType };
