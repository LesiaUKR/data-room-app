import {
  type BreadcrumbsResponse,
  type ContentsQuery,
  type ContentsResponse,
  type FileDetail,
  type PublicShare,
  type SignedUrlResponse,
} from '@data-room/contracts';

import { PrincipalKind } from '../../libs/enums/index.js';
import { HTTPCode } from '../../libs/modules/http/index.js';
import { type Principal } from '../../libs/types/index.js';
import { type FileService } from '../files/file.service.js';
import { type FolderService } from '../folders/folder.service.js';
import { hashShareToken } from './libs/helpers/index.js';
import { type ShareService } from './share.service.js';

type PublicShareControllerParameters = {
  fileService: FileService;
  folderService: FolderService;
  shareService: ShareService;
};

type TokenParams = { token: string };
type FolderParams = TokenParams & { folderId: string };
type FileParams = TokenParams & { fileId: string };

type ResolveResult = { status: typeof HTTPCode.OK; body: PublicShare };
type ContentsResult = { status: typeof HTTPCode.OK; body: ContentsResponse };
type BreadcrumbsResult = { status: typeof HTTPCode.OK; body: BreadcrumbsResponse };
type FileResult = { status: typeof HTTPCode.OK; body: FileDetail };
type DownloadUrlResult = { status: typeof HTTPCode.OK; body: SignedUrlResponse };

/**
 * Deliberately thin: it turns a path token into a principal and calls the very same services the
 * owner's routes use. No route here carries session middleware.
 */
class PublicShareController {
  private readonly fileService: FileService;

  private readonly folderService: FolderService;

  private readonly shareService: ShareService;

  public constructor({
    fileService,
    folderService,
    shareService,
  }: PublicShareControllerParameters) {
    this.fileService = fileService;
    this.folderService = folderService;
    this.shareService = shareService;
  }

  public async resolve({ params }: { params: TokenParams }): Promise<ResolveResult> {
    const share = await this.shareService.resolvePublic(params.token);

    return { status: HTTPCode.OK, body: share };
  }

  public async listContents({
    params,
    query,
  }: {
    params: FolderParams;
    query: ContentsQuery;
  }): Promise<ContentsResult> {
    const contents = await this.folderService.getContents({
      principal: this.toPrincipal(params.token),
      folderId: params.folderId,
      limit: query.limit,
      cursor: query.cursor,
    });

    return { status: HTTPCode.OK, body: contents };
  }

  public async listBreadcrumbs({ params }: { params: FolderParams }): Promise<BreadcrumbsResult> {
    const breadcrumbs = await this.folderService.getBreadcrumbs({
      principal: this.toPrincipal(params.token),
      folderId: params.folderId,
    });

    return { status: HTTPCode.OK, body: breadcrumbs };
  }

  public async getFile({ params }: { params: FileParams }): Promise<FileResult> {
    const file = await this.fileService.getFile({
      principal: this.toPrincipal(params.token),
      fileId: params.fileId,
    });

    return { status: HTTPCode.OK, body: file };
  }

  public async getDownloadUrl({ params }: { params: FileParams }): Promise<DownloadUrlResult> {
    const signed = await this.fileService.getDownloadUrl({
      principal: this.toPrincipal(params.token),
      fileId: params.fileId,
    });

    return { status: HTTPCode.OK, body: signed };
  }

  private toPrincipal(token: string): Principal {
    return { kind: PrincipalKind.PUBLIC_LINK, tokenHash: hashShareToken(token) };
  }
}

export { PublicShareController };
