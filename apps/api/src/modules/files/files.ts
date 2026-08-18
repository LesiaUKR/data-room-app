import { filesContract } from '@data-room/contracts';
import { initServer } from '@ts-rest/express';

import { authenticate, getActor, getUserPrincipal } from '../../libs/middleware/index.js';
import { accessPolicy } from '../../libs/modules/access/index.js';
import { prisma } from '../../libs/modules/database/index.js';
import { storage } from '../../libs/modules/storage/index.js';
import { folderRepository } from '../folders/folders.js';
import { FileController } from './file.controller.js';
import { FileRepository } from './file.repository.js';
import { FileService } from './file.service.js';

const fileRepository = new FileRepository(prisma);

// The repository, not FolderService: reserving a version re-reads the folder inside the same `tx`
const fileService = new FileService({
  accessPolicy,
  fileRepository,
  folderRepository,
  storage,
});

const fileController = new FileController({ fileService });

const server = initServer();

const fileRouter = server.router(filesContract, {
  createUploadIntent: {
    middleware: [authenticate],
    handler: ({ body, req }) => fileController.createUploadIntent({ actor: getActor(req), body }),
  },
  completeUpload: {
    middleware: [authenticate],
    handler: ({ params, req }) => fileController.completeUpload({ actor: getActor(req), params }),
  },
  getFile: {
    middleware: [authenticate],
    handler: ({ params, req }) =>
      fileController.getFile({ principal: getUserPrincipal(req), params }),
  },
  getDownloadUrl: {
    middleware: [authenticate],
    handler: ({ params, req }) =>
      fileController.getDownloadUrl({ principal: getUserPrincipal(req), params }),
  },
  rename: {
    middleware: [authenticate],
    handler: ({ params, body, req }) =>
      fileController.rename({ actor: getActor(req), params, body }),
  },
  move: {
    middleware: [authenticate],
    handler: ({ params, body, req }) => fileController.move({ actor: getActor(req), params, body }),
  },
  remove: {
    middleware: [authenticate],
    handler: ({ params, req }) => fileController.remove({ actor: getActor(req), params }),
  },
});

export { fileRepository, fileRouter, fileService };
