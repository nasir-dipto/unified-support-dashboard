import { Router } from 'express';
import {
  getReportsResolution,
  getReportsSla,
  getReportsTeam,
  getReportsVolume,
} from './reports.handlers.js';

export const reportsRouter = Router();

reportsRouter.get('/volume', getReportsVolume);
reportsRouter.get('/resolution', getReportsResolution);
reportsRouter.get('/sla', getReportsSla);
reportsRouter.get('/team', getReportsTeam);
