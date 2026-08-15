const NodeEnv = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
} as const;

type NodeEnv = (typeof NodeEnv)[keyof typeof NodeEnv];

export { NodeEnv };
