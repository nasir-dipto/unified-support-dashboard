import { Router } from 'express';
import { getHealthDetail } from './health.handlers.js';

export const healthRouter = Router();

healthRouter.get('/detail', getHealthDetail);
