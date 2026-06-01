import type { TicketsListPagination } from '@usd/shared-types';
import type { ReactElement } from 'react';

export type TicketPaginationProps = {
  pagination: TicketsListPagination;
  onPageChange: (page: number) => void;
};

/**
 * Builds visible page numbers with ellipsis for large page counts.
 */
export function buildPageNumbers(current: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | 'ellipsis')[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(totalPages - 1, current + 1);
  if (left > 2) {
    pages.push('ellipsis');
  }
  for (let p = left; p <= right; p += 1) {
    pages.push(p);
  }
  if (right < totalPages - 1) {
    pages.push('ellipsis');
  }
  pages.push(totalPages);
  return pages;
}

/**
 * Page-based pagination controls for the ticket queue.
 */
export function TicketPagination(props: TicketPaginationProps): ReactElement {
  const { pagination, onPageChange } = props;
  const { page, totalPages, hasPrev, hasNext } = pagination;

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2 text-xs text-gray-500">
        <span>
          Page {page} of {Math.max(totalPages, 1)}
        </span>
      </div>
    );
  }

  const pageNumbers = buildPageNumbers(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-3 py-2">
      <span className="text-xs text-gray-500">
        Page {page} of {totalPages}
      </span>
      <nav className="flex items-center gap-1" aria-label="Ticket list pagination">
        <PageButton label="First page" disabled={!hasPrev} onClick={() => { onPageChange(1); }}>
          «
        </PageButton>
        <PageButton label="Previous page" disabled={!hasPrev} onClick={() => { onPageChange(page - 1); }}>
          ‹
        </PageButton>
        {pageNumbers.map((n, idx) =>
          n === 'ellipsis' ? (
            <span key={`e-${String(idx)}`} className="px-1 text-xs text-gray-400">
              …
            </span>
          ) : (
            <PageButton
              key={n}
              label={`Page ${String(n)}`}
              active={n === page}
              onClick={() => { onPageChange(n); }}
            >
              {n}
            </PageButton>
          ),
        )}
        <PageButton label="Next page" disabled={!hasNext} onClick={() => { onPageChange(page + 1); }}>
          ›
        </PageButton>
        <PageButton
          label="Last page"
          disabled={!hasNext}
          onClick={() => { onPageChange(totalPages); }}
        >
          »
        </PageButton>
      </nav>
    </div>
  );
}

type PageButtonProps = {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
};

function PageButton(props: PageButtonProps): ReactElement {
  const { children, label, disabled = false, active = false, onClick } = props;
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`min-w-[28px] rounded-md px-2 py-1 text-xs font-semibold ${
        active
          ? 'bg-usd-indigo text-white'
          : disabled
            ? 'cursor-not-allowed text-gray-300'
            : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}
