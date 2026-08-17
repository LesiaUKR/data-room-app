import { initContract } from '@ts-rest/core';

import { authContract } from './auth.contract.js';
import { healthContract } from './health.contract.js';

const c = initContract();

const apiContract = c.router({
  auth: authContract,
  health: healthContract,
});

export { apiContract };
