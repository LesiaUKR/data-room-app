import { foldersContract } from '@data-room/contracts';
import { initServer } from '@ts-rest/express';

import { authenticate, getActor } from '../../libs/middleware/index.js';
import { accessPolicy } from '../../libs/modules/access/index.js';
import { prisma } from '../../libs/modules/database/index.js';
import { storage } from '../../libs/modules/storage/index.js';
import { FolderController } from './folder.controller.js';
import { FolderRepository } from './folder.repository.js';
import { FolderService } from './folder.service.js';

const folderRepository = new FolderRepository(prisma);

// Storage comes in because deleting a folder must retire the bytes under it, not just the rows
const folderService = new FolderService({ accessPolicy, folderRepository, storage });
const folderController = new FolderController({ folderService });

const server = initServer();

// Unlike auth, no route here is public: every one touches a data room resource
const folderRouter = server.router(foldersContract, {
  create: {
    middleware: [authenticate],
    handler: ({ body, req }) => folderController.create({ actor: getActor(req), body }),
  },
  rename: {
    middleware: [authenticate],
    handler: ({ params, body, req }) =>
      folderController.rename({ actor: getActor(req), params, body }),
  },
  remove: {
    middleware: [authenticate],
    handler: ({ params, req }) => folderController.remove({ actor: getActor(req), params }),
  },
  listContents: {
    middleware: [authenticate],
    handler: ({ params, query, req }) =>
      folderController.listContents({ actor: getActor(req), params, query }),
  },
  listBreadcrumbs: {
    middleware: [authenticate],
    handler: ({ params, req }) =>
      folderController.listBreadcrumbs({ actor: getActor(req), params }),
  },
  subtreeStats: {
    middleware: [authenticate],
    handler: ({ params, req }) => folderController.subtreeStats({ actor: getActor(req), params }),
  },
});

export { folderRepository, folderRouter, folderService };
