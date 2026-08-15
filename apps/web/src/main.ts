import { ShareRole } from '@data-room/contracts';

// Temporary: proves apps/web resolves the same workspace package under bundler resolution.
// Replaced by main.tsx and the router in Issue 02.
const defaultShareRole: ShareRole = ShareRole.VIEWER;

export { defaultShareRole };
