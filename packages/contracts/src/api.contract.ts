import { initContract } from '@ts-rest/core';

import { authContract } from './auth.contract.js';
import { filesContract } from './files.contract.js';
import { foldersContract } from './folders.contract.js';
import { healthContract } from './health.contract.js';
import { publicSharesContract } from './public-shares.contract.js';
import { sharesContract } from './shares.contract.js';

const c = initContract();

const apiContract = c.router({
  auth: authContract,
  files: filesContract,
  folders: foldersContract,
  health: healthContract,
  publicShares: publicSharesContract,
  shares: sharesContract,
});

export { apiContract };
