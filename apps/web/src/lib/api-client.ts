import { apiContract } from '@data-room/contracts';
import { initTsrReactQuery } from '@ts-rest/react-query/v5';

const API_BASE_URL = '/api';

const tsr = initTsrReactQuery(apiContract, {
  baseUrl: API_BASE_URL,
  baseHeaders: {},
});

export { tsr };
