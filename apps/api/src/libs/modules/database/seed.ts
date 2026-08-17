import { randomUUID } from 'node:crypto';

import { normalizeName } from '../../helpers/index.js';
import { passwordHasher } from '../auth/index.js';
import { config } from '../config/index.js';
import { FileVersionStatus } from './generated/client.js';
import { prisma } from './prisma.js';
import { transaction, type TransactionClient } from './transaction.js';

// Seeded users are ordinary owners: a committed password would be a working production login
const MISSING_PASSWORD_MESSAGE =
  'Refusing to seed: set SEED_PASSWORD in apps/api/.env. Seeded accounts can sign in, so the value must never be committed.';

// Local development and the deployed API share one database, so NODE_ENV cannot decide this
const RESET_FLAG = '--reset';
const RESET_COMMAND = 'npm run db:seed:reset';

const ROOT_DEPTH = 0;
const FIRST_LEVEL_DEPTH = 1;

const buildObjectKey = (ids: { dataRoomId: string; fileId: string; versionId: string }): string =>
  `${ids.dataRoomId}/${ids.fileId}/${ids.versionId}`;

/** Reverse dependency order; the current-version pointer breaks the File/FileVersion cycle. */
const clearDatabase = async (tx: TransactionClient): Promise<void> => {
  await tx.shareGrant.deleteMany();
  await tx.file.updateMany({ data: { currentVersionId: null } });
  await tx.fileVersion.deleteMany();
  await tx.file.deleteMany();
  await tx.folder.deleteMany();
  await tx.dataRoom.deleteMany();
  await tx.user.deleteMany();
};

type SeedFileInput = {
  dataRoomId: string;
  folderId: string;
  createdById: string;
  name: string;
  versionCount: number;
};

/** Creates the file, its versions, then promotes the newest — the order the upload flow uses. */
const seedFile = async (tx: TransactionClient, input: SeedFileInput): Promise<void> => {
  const fileId = randomUUID();

  await tx.file.create({
    data: {
      id: fileId,
      dataRoomId: input.dataRoomId,
      folderId: input.folderId,
      name: input.name,
      normalizedName: normalizeName(input.name),
    },
  });

  let latestVersionId = '';

  for (let versionNumber = 1; versionNumber <= input.versionCount; versionNumber += 1) {
    const versionId = randomUUID();

    await tx.fileVersion.create({
      data: {
        id: versionId,
        fileId,
        versionNumber,
        objectKey: buildObjectKey({ dataRoomId: input.dataRoomId, fileId, versionId }),
        sizeBytes: BigInt(1024 * versionNumber),
        contentType: 'application/pdf',
        status: FileVersionStatus.READY,
        createdById: input.createdById,
      },
    });

    latestVersionId = versionId;
  }

  await tx.file.update({
    where: { id: fileId },
    data: { currentVersionId: latestVersionId },
  });
};

const seed = async (): Promise<void> => {
  if (config.isProduction) {
    throw new Error('Refusing to seed: this wipes every row and must never run in production.');
  }

  if (!process.argv.includes(RESET_FLAG)) {
    throw new Error(
      `Refusing to seed: every data room, folder, file and user in the target database would be deleted. Re-run with: ${RESET_COMMAND}`,
    );
  }

  if (!config.seedPassword) {
    throw new Error(MISSING_PASSWORD_MESSAGE);
  }

  // Same port as sign-up, so seeded hashes share the runtime cost factor
  const passwordHash = await passwordHasher.hash(config.seedPassword);

  await transaction(async (tx) => {
    await clearDatabase(tx);

    // --- Ivan ---------------------------------------------------------------
    const ivanId = randomUUID();
    const acmeId = randomUUID();
    const acmeRootId = randomUUID();
    const financialsId = randomUUID();
    const legalId = randomUUID();

    await tx.user.create({
      data: { id: ivanId, email: 'ivan@acme.example', passwordHash },
    });

    await tx.dataRoom.create({
      data: { id: acmeId, ownerId: ivanId, name: 'Acme Acquisition' },
    });

    // The only folder in the room with no parent — the partial unique index enforces that
    await tx.folder.create({
      data: {
        id: acmeRootId,
        dataRoomId: acmeId,
        parentFolderId: null,
        name: 'Acme Acquisition',
        normalizedName: normalizeName('Acme Acquisition'),
        depth: ROOT_DEPTH,
      },
    });

    await tx.folder.createMany({
      data: [
        {
          id: financialsId,
          dataRoomId: acmeId,
          parentFolderId: acmeRootId,
          name: 'Financials',
          normalizedName: normalizeName('Financials'),
          depth: FIRST_LEVEL_DEPTH,
        },
        {
          id: legalId,
          dataRoomId: acmeId,
          parentFolderId: acmeRootId,
          name: 'Legal',
          normalizedName: normalizeName('Legal'),
          depth: FIRST_LEVEL_DEPTH,
        },
      ],
    });

    // Two versions: proof that renaming a file never touches its stored objects
    await seedFile(tx, {
      dataRoomId: acmeId,
      folderId: financialsId,
      createdById: ivanId,
      name: 'Contract.pdf',
      versionCount: 2,
    });

    await seedFile(tx, {
      dataRoomId: acmeId,
      folderId: legalId,
      createdById: ivanId,
      name: 'NDA.pdf',
      versionCount: 1,
    });

    // --- Maria: a second tenant, fully isolated -----------------------------
    const mariaId = randomUUID();
    const globexId = randomUUID();
    const globexRootId = randomUUID();
    const reportsId = randomUUID();

    await tx.user.create({
      data: { id: mariaId, email: 'maria@globex.example', passwordHash },
    });

    await tx.dataRoom.create({
      data: { id: globexId, ownerId: mariaId, name: 'Globex Diligence' },
    });

    await tx.folder.create({
      data: {
        id: globexRootId,
        dataRoomId: globexId,
        parentFolderId: null,
        name: 'Globex Diligence',
        normalizedName: normalizeName('Globex Diligence'),
        depth: ROOT_DEPTH,
      },
    });

    await tx.folder.create({
      data: {
        id: reportsId,
        dataRoomId: globexId,
        parentFolderId: globexRootId,
        name: 'Reports',
        normalizedName: normalizeName('Reports'),
        depth: FIRST_LEVEL_DEPTH,
      },
    });

    await seedFile(tx, {
      dataRoomId: globexId,
      folderId: reportsId,
      createdById: mariaId,
      name: 'Summary.pdf',
      versionCount: 1,
    });
  });
};

await seed();
await prisma.$disconnect();
