import { Router } from 'express';
import { postAiInvoke } from './ai.handlers.js';

export const aiRouter = Router();

aiRouter.post('/invoke', ...postAiInvoke);
