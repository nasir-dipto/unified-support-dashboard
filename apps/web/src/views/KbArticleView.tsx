import type { ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';
import { KbArticleReader } from '../components/kb/KbArticleReader.js';
import { usePublishedKbArticle } from '../hooks/useKbBrowse.js';

/**
 * Published KB article reader at /kb/:kbId.
 */
export function KbArticleView(): ReactElement {
  const { kbId } = useParams<{ kbId: string }>();
  const query = usePublishedKbArticle(kbId);

  if (query.isLoading) {
    return <p className="text-sm text-gray-500">Loading article…</p>;
  }
  if (query.data === undefined) {
    return <p className="text-sm text-gray-500">Article not found.</p>;
  }

  return (
    <div>
      <Link to="/kb" className="text-sm font-semibold text-usd-indigo">
        ← Back to Knowledge Base
      </Link>
      <div className="mt-4 rounded-xl border border-gray-100 bg-white p-6">
        <KbArticleReader article={query.data} />
      </div>
    </div>
  );
}
