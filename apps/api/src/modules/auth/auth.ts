import { authContract } from '@data-room/contracts';
import { initServer } from '@ts-rest/express';

import { authenticate, getActor } from '../../libs/middleware/index.js';
import { passwordHasher, tokenSigner } from '../../libs/modules/auth/index.js';
import { prisma } from '../../libs/modules/database/index.js';
import { AuthController } from './auth.controller.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';

const authRepository = new AuthRepository(prisma);
const authService = new AuthService({ authRepository, passwordHasher, tokenSigner });
const authController = new AuthController({ authService });

const server = initServer();

const authRouter = server.router(authContract, {
  signUp: ({ body, res }) => authController.signUp({ body, response: res }),
  signIn: ({ body, res }) => authController.signIn({ body, response: res }),
  signOut: ({ res }) => authController.signOut({ response: res }),
  // The only guarded route here: sign-up and sign-in are the way in, sign-out just clears a cookie
  me: {
    middleware: [authenticate],
    handler: ({ req }) => authController.getSession({ actor: getActor(req) }),
  },
});

export { authRouter, authService };
