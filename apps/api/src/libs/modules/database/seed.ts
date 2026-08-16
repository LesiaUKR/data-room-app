import { randomUUID } from 'node:crypto';

import { hash } from 'bcryptjs';

import { config } from '../config/index.js';
import { FileVersionStatus } from './generated/client.js';
import { prisma } from './prisma.js';
import { transaction, type TransactionClient } from './transaction.js';

const PASSWORD_HASH_ROUNDS = 10;
const SEED_PASSWORD = 'Password123!';

/**
 * Seeding wipes every row. NODE_ENV cannot tell whether the target database is disposable —
 * local development and the deployed API currently share one Neon database — so the destructive
 * part is opt-in per run. A command-line flag has to be typed each time; an environment variable
 * could linger in a shell profile or a CI definition.
 *
 * The flag reaches this script only through the dedicated `db:seed:reset` npm script: plain
 * `npm run db:seed -- --reset` hands the flag to the Prisma CLI, which rejects it.
 */
const RESET_FLAG = '--reset';
const RESET_COMMAND = 'npm run db:seed:reset';

const ROOT_DEPTH = 0;
const FIRST_LEVEL_DEPTH = 1;

const normalize = (name: string): string => name.trim().toLowerCase();

const buildObjectKey = (ids: { dataRoomId: string; fileId: string; versionId: string }): string =>
  `${ids.dataRoomId}/${ids.fileId}/${ids.versionId}`;

/**
 * Foreign keys are RESTRICT, so rows go in reverse dependency order. The current-version
 * pointer is cleared first: File and FileVersion reference each other.
 */
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

/**
 * Creates the logical file, its version history, and promotes the newest version — the same
 * order the upload flow will follow in Issue 06.
 */
const seedFile = async (tx: TransactionClient, input: SeedFileInput): Promise<void> => {
  const fileId = randomUUID();

  await tx.file.create({
    data: {
      id: fileId,
      dataRoomId: input.dataRoomId,
      folderId: input.folderId,
      name: input.name,
      normalizedName: normalize(input.name),
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

  const passwordHash = await hash(SEED_PASSWORD, PASSWORD_HASH_ROUNDS);

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
        normalizedName: normalize('Acme Acquisition'),
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
          normalizedName: normalize('Financials'),
          depth: FIRST_LEVEL_DEPTH,
        },
        {
          id: legalId,
          dataRoomId: acmeId,
          parentFolderId: acmeRootId,
          name: 'Legal',
          normalizedName: normalize('Legal'),
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
        normalizedName: normalize('Globex Diligence'),
        depth: ROOT_DEPTH,
      },
    });

    await tx.folder.create({
      data: {
        id: reportsId,
        dataRoomId: globexId,
        parentFolderId: globexRootId,
        name: 'Reports',
        normalizedName: normalize('Reports'),
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
