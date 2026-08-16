/** Reachability of one external dependency. Never carries a reason — that goes to the logs. */
const DependencyStatus = {
  UP: 'up',
  DOWN: 'down',
} as const;

type DependencyStatus = (typeof DependencyStatus)[keyof typeof DependencyStatus];

export { DependencyStatus };
