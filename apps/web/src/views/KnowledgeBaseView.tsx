import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { KbArticleList } from '../components/kb/KbArticleList.js';
import { KbBrowseSearch } from '../components/kb/KbBrowseSearch.js';
import { usePublishedKbList } from '../hooks/useKbBrowse.js';

/**
 * KB browse page — published articles only (all roles).
 */
export function KnowledgeBaseView(): ReactElement {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const query = usePublishedKbList(debounced.length > 0 ? debounced : undefined);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q.trim());
    }, 300);
    return () => {
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div>
      <h1 className="text-[26px] font-extrabold text-gray-900">Knowledge Base</h1>
      <p className="mb-5 text-sm text-gray-500">Browse published support articles.</p>
      <KbBrowseSearch value={q} onChange={setQ} />
      <div className="mt-6">
        {query.isLoading ? (
          <p className="text-sm text-gray-500">Loading articles…</p>
        ) : (
          <KbArticleList articles={query.data ?? []} />
        )}
      </div>
    </div>
  );
}
