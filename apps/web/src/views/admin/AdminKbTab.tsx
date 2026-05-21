import type { KbArticle } from '@usd/shared-types';
import { Badge, usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { DetailModal } from '../../components/tickets/DetailModal';
import {
  useDeleteKbArticle,
  useKbArticles,
  usePublishKbArticle,
} from '../../hooks/useKb';

/**
 * Renders clickable source ticket IDs for a KB article.
 */
function KbSourceTickets(props: {
  sourceTicketIds: string[];
  onSelectTicket: (ticketId: string) => void;
}): ReactElement | null {
  const { sourceTicketIds, onSelectTicket } = props;
  if (sourceTicketIds.length === 0) {
    return null;
  }
  return (
    <p className="mt-1 text-sm text-gray-600" data-testid="kb-article-sources">
      <span className="font-medium text-gray-500">Sources: </span>
      {sourceTicketIds.map((id, index) => (
        <span key={id}>
          {index > 0 ? ', ' : ''}
          <button
            type="button"
            className="font-semibold text-usd-indigo hover:underline"
            onClick={() => { onSelectTicket(id); }}
          >
            {id}
          </button>
        </span>
      ))}
    </p>
  );
}

/**
 * Admin/manager Knowledge Base management — list drafts and published articles.
 */
export function AdminKbTab(): ReactElement {
  const [filter, setFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const status = filter === 'all' ? undefined : filter;
  const { data, isLoading, isError } = useKbArticles(status);
  const publish = usePublishKbArticle();
  const remove = useDeleteKbArticle();

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading knowledge base…</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-usd-red" role="alert">
        Unable to load KB articles. Ensure Postgres is running and POSTGRES_URL is set.
      </p>
    );
  }

  const articles: KbArticle[] = data ?? [];

  return (
    <>
      <div>
        <p className="mb-4 text-sm text-gray-500">
          Draft articles are saved without embeddings. Publishing computes a Titan embedding for
          semantic search.
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {(['all', 'draft', 'published'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => { setFilter(f); }}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                filter === f
                  ? 'bg-indigo-100 text-indigo-900'
                  : 'border border-gray-200 text-gray-600'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        {articles.length === 0 ? (
          <p className="text-sm text-gray-500">
            No articles yet. Generate drafts from resolved tickets.
          </p>
        ) : (
          <ul className="space-y-3">
            {articles.map((a) => (
              <li
                key={a.kbId}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{a.title}</h3>
                    <KbSourceTickets
                      sourceTicketIds={a.sourceTicketIds}
                      onSelectTicket={(id) => { setDetailId(id); }}
                    />
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{a.problem}</p>
                  </div>
                  <Badge
                    label={a.status}
                    color={a.status === 'published' ? usdColors.teal : usdColors.amber}
                    sm
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.status === 'draft' ? (
                    <button
                      type="button"
                      disabled={publish.isPending}
                      onClick={() => { void publish.mutateAsync(a.kbId); }}
                      className="rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                      style={{ backgroundColor: usdColors.teal }}
                    >
                      Publish
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={remove.isPending}
                    onClick={() => { void remove.mutateAsync(a.kbId); }}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <DetailModal
        ticketId={detailId}
        open={detailId !== null}
        onClose={() => { setDetailId(null); }}
      />
    </>
  );
}
