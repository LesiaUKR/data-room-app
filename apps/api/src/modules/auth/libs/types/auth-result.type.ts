import { type SessionResponse } from '@data-room/contracts';

/** The token is set as a cookie by the controller; the session is the response body. */
type AuthResult = {
  token: string;
  session: SessionResponse;
};

export { type AuthResult };
