import { useQuery } from '@tanstack/react-query';
import { getPublishedKbArticle, listPublishedKbArticles } from '../api/kb.js';

/**
 * Published KB articles for browse page.
 */
export function usePublishedKbList(q?: string) {
  return useQuery({
    queryKey: ['kb', 'published', q ?? ''],
    queryFn: () => listPublishedKbArticles(q),
  });
}

/**
 * Single published KB article for reader.
 */
export function usePublishedKbArticle(kbId: string | undefined) {
  return useQuery({
    queryKey: ['kb', 'published', kbId],
    queryFn: () => {
      if (kbId === undefined || kbId.length === 0) {
        throw new Error('kbId required');
      }
      return getPublishedKbArticle(kbId);
    },
    enabled: kbId !== undefined && kbId.length > 0,
  });
}
