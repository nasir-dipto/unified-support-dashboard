import { Router } from 'express';
import {
  deleteKb,
  getKbById,
  getKbList,
  getKbPublishedById,
  getKbPublishedList,
  postKb,
  postKbPublish,
  postKbSearch,
  putKb,
} from './kb.handlers.js';

/**
 * Knowledge base REST routes under /api/kb.
 */
export const kbRouter = Router();

kbRouter.get('/published', ...getKbPublishedList);
kbRouter.get('/published/:kbId', ...getKbPublishedById);
kbRouter.get('/', ...getKbList);
kbRouter.post('/search', ...postKbSearch);
kbRouter.post('/', ...postKb);
kbRouter.get('/:kbId', ...getKbById);
kbRouter.put('/:kbId', ...putKb);
kbRouter.delete('/:kbId', ...deleteKb);
kbRouter.post('/:kbId/publish', ...postKbPublish);
