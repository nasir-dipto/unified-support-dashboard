import type { KbSearchResult } from '@usd/shared-types';
import { Badge, usdColors } from '@usd/ui';
import type { ReactElement } from 'react';

export type KbSearchResultsProps = {
  results: KbSearchResult[];
  loading?: boolean;
  note?: string;
};

/**
 * Displays semantic KB search hits with similarity scores.
 */
export function KbSearchResults(props: KbSearchResultsProps): ReactElement {
  const { results, loading, note } = props;

  if (loading === true) {
    return <p className="text-sm text-gray-500">Searching knowledge base…</p>;
  }

  return (
    <div className="space-y-2">
      {note !== undefined && note.length > 0 ? (
        <p className="text-xs text-amber-700">{note}</p>
      ) : null}
      {results.length === 0 ? (
        <p className="text-sm text-gray-500">No matching published articles.</p>
      ) : (
        <ul className="space-y-2">
          {results.map((r) => (
            <li
              key={r.kbId}
              className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-gray-900">{r.title}</span>
                <Badge
                  label={`${String(Math.round(r.similarity * 100))}% match`}
                  color={usdColors.teal}
                  sm
                />
              </div>
              <p className="mt-2 line-clamp-3 text-gray-600">{r.problem}</p>
              {r.sourceTicketIds.length > 0 ? (
                <p className="mt-2 text-xs text-gray-400">
                  Sources: {r.sourceTicketIds.join(', ')}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
