import { initContract } from '@ts-rest/core';

import { authContract } from './auth.contract.js';
import { filesContract } from './files.contract.js';
import { foldersContract } from './folders.contract.js';
import { healthContract } from './health.contract.js';

const c = initContract();

const apiContract = c.router({
  auth: authContract,
  files: filesContract,
  folders: foldersContract,
  health: healthContract,
});

export { apiContract };
