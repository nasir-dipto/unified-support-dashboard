import { Router } from 'express';
import {
  getPreferencesHandler,
  getSlaPolicyHandler,
  getSmtpSettingsHandler,
  postSmtpTestHandler,
  putPreferencesHandler,
  putSlaPolicyHandler,
  putSmtpSettingsHandler,
} from './settings.handlers.js';

export const settingsRouter = Router();

settingsRouter.get('/sla', getSlaPolicyHandler);
settingsRouter.put('/sla', putSlaPolicyHandler);
settingsRouter.get('/smtp', getSmtpSettingsHandler);
settingsRouter.put('/smtp', putSmtpSettingsHandler);
settingsRouter.post('/smtp/test', postSmtpTestHandler);
settingsRouter.get('/preferences', getPreferencesHandler);
settingsRouter.put('/preferences', putPreferencesHandler);
