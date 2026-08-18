import {
  type CreatedShare,
  type CreateShare,
  type ListSharesQuery,
  type SharesResponse,
} from '@data-room/contracts';

import { HTTPCode } from '../../libs/modules/http/index.js';
import { type Actor } from '../../libs/types/index.js';
import { type ShareService } from './share.service.js';

type ShareControllerParameters = {
  shareService: ShareService;
};

type CreateRequest = {
  actor: Actor;
  body: CreateShare;
};

type ListRequest = {
  actor: Actor;
  query: ListSharesQuery;
};

type RevokeRequest = {
  actor: Actor;
  params: { shareId: string };
};

type CreateResult =
  | { status: typeof HTTPCode.OK; body: CreatedShare }
  | { status: typeof HTTPCode.CREATED; body: CreatedShare };

type ListResult = { status: typeof HTTPCode.OK; body: SharesResponse };
type RevokeResult = { status: typeof HTTPCode.NO_CONTENT; body: undefined };

class ShareController {
  private readonly shareService: ShareService;

  public constructor({ shareService }: ShareControllerParameters) {
    this.shareService = shareService;
  }

  public async create({ actor, body }: CreateRequest): Promise<CreateResult> {
    const outcome = await this.shareService.create({ actor, input: body });

    return outcome.created
      ? { status: HTTPCode.CREATED, body: outcome.body }
      : { status: HTTPCode.OK, body: outcome.body };
  }

  public async list({ actor, query }: ListRequest): Promise<ListResult> {
    const shares = await this.shareService.list({ actor, query });

    return { status: HTTPCode.OK, body: shares };
  }

  public async revoke({ actor, params }: RevokeRequest): Promise<RevokeResult> {
    await this.shareService.revoke({ actor, shareId: params.shareId });

    return { status: HTTPCode.NO_CONTENT, body: undefined };
  }
}

export { ShareController };
