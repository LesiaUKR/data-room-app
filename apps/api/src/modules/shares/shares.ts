import { publicSharesContract, sharesContract } from '@data-room/contracts';
import { initServer } from '@ts-rest/express';

import { authenticate, getActor } from '../../libs/middleware/index.js';
import { accessPolicy } from '../../libs/modules/access/index.js';
import { prisma } from '../../libs/modules/database/index.js';
import { authService } from '../auth/auth.js';
import { fileRepository, fileService } from '../files/files.js';
import { folderRepository, folderService } from '../folders/folders.js';
import { PublicShareController } from './public-share.controller.js';
import { ShareController } from './share.controller.js';
import { ShareRepository } from './share.repository.js';
import { ShareService } from './share.service.js';

const shareRepository = new ShareRepository(prisma);

// Folder and file repositories, not their services: the target is re-read inside the share `tx`
const shareService = new ShareService({
  accessPolicy,
  authService,
  fileRepository,
  folderRepository,
  shareRepository,
});

const shareController = new ShareController({ shareService });

const publicShareController = new PublicShareController({
  fileService,
  folderService,
  shareService,
});

const server = initServer();

const shareRouter = server.router(sharesContract, {
  create: {
    middleware: [authenticate],
    handler: ({ body, req }) => shareController.create({ actor: getActor(req), body }),
  },
  list: {
    middleware: [authenticate],
    handler: ({ query, req }) => shareController.list({ actor: getActor(req), query }),
  },
  revoke: {
    middleware: [authenticate],
    handler: ({ params, req }) => shareController.revoke({ actor: getActor(req), params }),
  },
});

// No middleware anywhere in this router: a public link has to work with no session at all
const publicShareRouter = server.router(publicSharesContract, {
  resolve: ({ params }) => publicShareController.resolve({ params }),
  listContents: ({ params, query }) => publicShareController.listContents({ params, query }),
  listBreadcrumbs: ({ params }) => publicShareController.listBreadcrumbs({ params }),
  getFile: ({ params }) => publicShareController.getFile({ params }),
  getDownloadUrl: ({ params }) => publicShareController.getDownloadUrl({ params }),
});

export { publicShareRouter, shareRepository, shareRouter, shareService };
