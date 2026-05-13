import { Router } from 'express';
import {
  getMe,
  postForgotPassword,
  postLogin,
  postLogout,
  postRefresh,
  postResetPassword,
} from './auth.handlers.js';

export const authRouter = Router();

authRouter.get('/me', ...getMe);
authRouter.post('/login', postLogin);
authRouter.post('/refresh', postRefresh);
authRouter.post('/logout', ...postLogout);
authRouter.post('/forgot-password', postForgotPassword);
authRouter.post('/reset-password', postResetPassword);
