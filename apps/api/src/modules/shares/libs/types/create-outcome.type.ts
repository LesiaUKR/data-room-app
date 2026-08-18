import { type CreatedShare } from '@data-room/contracts';

// `created` picks 201 over 200: re-sharing to the same user is not an error
type CreateOutcome = {
  created: boolean;
  body: CreatedShare;
};

export { type CreateOutcome };
