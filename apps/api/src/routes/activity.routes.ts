import { Router } from 'express';
import { getRecentActivity } from './activity.handlers.js';

export const activityRouter = Router();

activityRouter.get('/recent', getRecentActivity);
