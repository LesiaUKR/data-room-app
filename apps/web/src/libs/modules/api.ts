import { healthContract } from '@data-room/contracts';
import { initTsrReactQuery } from '@ts-rest/react-query/v5';

const API_BASE_URL = '/api';

const tsr = initTsrReactQuery(healthContract, {
  baseUrl: API_BASE_URL,
  baseHeaders: {},
});

export { tsr };
