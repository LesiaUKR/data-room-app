import { prisma } from '../database/index.js';
import { AccessPolicy } from './access-policy.js';
import { AccessRepository } from './access.repository.js';

const accessRepository = new AccessRepository(prisma);
const accessPolicy = new AccessPolicy({ accessRepository });

export { accessPolicy, accessRepository };
