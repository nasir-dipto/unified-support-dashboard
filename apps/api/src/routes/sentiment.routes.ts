import { Router } from 'express';
import { getSentimentSummary } from './sentiment.handlers.js';

export const sentimentRouter = Router();

sentimentRouter.get('/summary', ...getSentimentSummary);
