import { type Actor } from './actor.type.js';

declare global {
  namespace Express {
    interface Request {
      actor?: Actor;
    }
  }
}
