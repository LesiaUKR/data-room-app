import {
  type BreadcrumbsResponse,
  type ContentsQuery,
  type ContentsResponse,
  type CreateFolder,
  type Folder,
  type RenameFolder,
  type SubtreeStats,
} from '@data-room/contracts';

import { HTTPCode } from '../../libs/modules/http/index.js';
import { type Actor } from '../../libs/types/index.js';
import { type FolderService } from './folder.service.js';

type FolderControllerParameters = {
  folderService: FolderService;
};

type FolderIdParams = {
  folderId: string;
};

type CreateRequest = {
  actor: Actor;
  body: CreateFolder;
};

type RenameRequest = {
  actor: Actor;
  params: FolderIdParams;
  body: RenameFolder;
};

type FolderRequest = {
  actor: Actor;
  params: FolderIdParams;
};

type ContentsRequest = FolderRequest & {
  query: ContentsQuery;
};

type CreateResult = { status: typeof HTTPCode.CREATED; body: Folder };
type RenameResult = { status: typeof HTTPCode.OK; body: Folder };
type RemoveResult = { status: typeof HTTPCode.NO_CONTENT; body: undefined };
type ContentsResult = { status: typeof HTTPCode.OK; body: ContentsResponse };
type BreadcrumbsResult = { status: typeof HTTPCode.OK; body: BreadcrumbsResponse };
type SubtreeStatsResult = { status: typeof HTTPCode.OK; body: SubtreeStats };

class FolderController {
  private readonly folderService: FolderService;

  public constructor({ folderService }: FolderControllerParameters) {
    this.folderService = folderService;
  }

  public async create({ actor, body }: CreateRequest): Promise<CreateResult> {
    const folder = await this.folderService.create({
      actor,
      parentFolderId: body.parentFolderId,
      name: body.name,
    });

    return { status: HTTPCode.CREATED, body: folder };
  }

  public async rename({ actor, params, body }: RenameRequest): Promise<RenameResult> {
    const folder = await this.folderService.rename({
      actor,
      folderId: params.folderId,
      name: body.name,
    });

    return { status: HTTPCode.OK, body: folder };
  }

  public async remove({ actor, params }: FolderRequest): Promise<RemoveResult> {
    await this.folderService.remove({ actor, folderId: params.folderId });

    return { status: HTTPCode.NO_CONTENT, body: undefined };
  }

  public async listContents({ actor, params, query }: ContentsRequest): Promise<ContentsResult> {
    const contents = await this.folderService.getContents({
      actor,
      folderId: params.folderId,
      limit: query.limit,
      cursor: query.cursor,
    });

    return { status: HTTPCode.OK, body: contents };
  }

  public async listBreadcrumbs({ actor, params }: FolderRequest): Promise<BreadcrumbsResult> {
    const breadcrumbs = await this.folderService.getBreadcrumbs({
      actor,
      folderId: params.folderId,
    });

    return { status: HTTPCode.OK, body: breadcrumbs };
  }

  public async subtreeStats({ actor, params }: FolderRequest): Promise<SubtreeStatsResult> {
    const stats = await this.folderService.getSubtreeStats({
      actor,
      folderId: params.folderId,
    });

    return { status: HTTPCode.OK, body: stats };
  }
}

export { FolderController, type FolderControllerParameters };
