import { Router } from 'express';
import { getUsers, postInviteUser } from './users.handlers.js';

/**
 * User management routes under /api/users.
 */
export const usersRouter = Router();

usersRouter.get('/', ...getUsers);
usersRouter.post('/invite', ...postInviteUser);
