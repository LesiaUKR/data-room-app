const HTTPHeader = {
  REQUEST_ID: 'x-request-id',
} as const;

type HTTPHeader = (typeof HTTPHeader)[keyof typeof HTTPHeader];

export { HTTPHeader };
