const PrincipalKind = {
  USER: 'USER',
  PUBLIC_LINK: 'PUBLIC_LINK',
} as const;

type PrincipalKind = (typeof PrincipalKind)[keyof typeof PrincipalKind];

export { PrincipalKind };
