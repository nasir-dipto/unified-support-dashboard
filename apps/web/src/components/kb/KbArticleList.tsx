import type { KbArticle } from '@usd/shared-types';
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

export type KbArticleListProps = {
  articles: KbArticle[];
};

/**
 * Lists published KB articles with links to the reader view.
 */
export function KbArticleList(props: KbArticleListProps): ReactElement {
  const { articles } = props;
  if (articles.length === 0) {
    return <p className="text-sm text-gray-500">No published articles found.</p>;
  }
  return (
    <ul className="space-y-2">
      {articles.map((a) => (
        <li key={a.kbId}>
          <Link
            to={`/kb/${a.kbId}`}
            className="block rounded-lg border border-gray-100 bg-white p-4 hover:border-usd-indigo"
          >
            <div className="font-bold text-gray-900">{a.title}</div>
            <p className="mt-1 line-clamp-2 text-sm text-gray-600">{a.problem}</p>
            {a.tags.length > 0 ? (
              <p className="mt-2 text-xs text-gray-400">{a.tags.join(' · ')}</p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
