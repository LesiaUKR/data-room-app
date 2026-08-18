import {
  type CompletedVersion,
  type CreateUploadIntent,
  type DataRoomFile,
  type FileDetail,
  type MoveFile,
  type RenameFile,
  type SignedUrlResponse,
  type UploadIntent,
} from '@data-room/contracts';

import { HTTPCode } from '../../libs/modules/http/index.js';
import { type Actor, type Principal } from '../../libs/types/index.js';
import { type FileService } from './file.service.js';

type FileControllerParameters = {
  fileService: FileService;
};

type FileIdParams = {
  fileId: string;
};

type VersionIdParams = {
  versionId: string;
};

type UploadIntentRequest = {
  actor: Actor;
  body: CreateUploadIntent;
};

type CompleteRequest = {
  actor: Actor;
  params: VersionIdParams;
};

type FileRequest = {
  actor: Actor;
  params: FileIdParams;
};

type FileReadRequest = {
  principal: Principal;
  params: FileIdParams;
};

type RenameRequest = FileRequest & {
  body: RenameFile;
};

type MoveRequest = FileRequest & {
  body: MoveFile;
};

type UploadIntentResult = { status: typeof HTTPCode.CREATED; body: UploadIntent };
type CompleteResult = { status: typeof HTTPCode.OK; body: CompletedVersion };
type DownloadUrlResult = { status: typeof HTTPCode.OK; body: SignedUrlResponse };
type FileResult = { status: typeof HTTPCode.OK; body: DataRoomFile };
type FileDetailResult = { status: typeof HTTPCode.OK; body: FileDetail };
type RemoveResult = { status: typeof HTTPCode.NO_CONTENT; body: undefined };

class FileController {
  private readonly fileService: FileService;

  public constructor({ fileService }: FileControllerParameters) {
    this.fileService = fileService;
  }

  public async createUploadIntent({
    actor,
    body,
  }: UploadIntentRequest): Promise<UploadIntentResult> {
    const intent = await this.fileService.createUploadIntent({
      actor,
      folderId: body.folderId,
      name: body.name,
      contentType: body.contentType,
    });

    return { status: HTTPCode.CREATED, body: intent };
  }

  public async completeUpload({ actor, params }: CompleteRequest): Promise<CompleteResult> {
    const version = await this.fileService.completeUpload({
      actor,
      versionId: params.versionId,
    });

    return { status: HTTPCode.OK, body: version };
  }

  public async getFile({ principal, params }: FileReadRequest): Promise<FileDetailResult> {
    const file = await this.fileService.getFile({ principal, fileId: params.fileId });

    return { status: HTTPCode.OK, body: file };
  }

  public async getDownloadUrl({ principal, params }: FileReadRequest): Promise<DownloadUrlResult> {
    const signed = await this.fileService.getDownloadUrl({ principal, fileId: params.fileId });

    return { status: HTTPCode.OK, body: signed };
  }

  public async rename({ actor, params, body }: RenameRequest): Promise<FileResult> {
    const file = await this.fileService.rename({
      actor,
      fileId: params.fileId,
      name: body.name,
    });

    return { status: HTTPCode.OK, body: file };
  }

  public async move({ actor, params, body }: MoveRequest): Promise<FileResult> {
    const file = await this.fileService.move({
      actor,
      fileId: params.fileId,
      folderId: body.folderId,
    });

    return { status: HTTPCode.OK, body: file };
  }

  public async remove({ actor, params }: FileRequest): Promise<RemoveResult> {
    await this.fileService.remove({ actor, fileId: params.fileId });

    return { status: HTTPCode.NO_CONTENT, body: undefined };
  }
}

export { FileController, type FileControllerParameters };
