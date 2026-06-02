import type { ReactElement, ReactNode } from 'react';

export type OverlayProps = {
  title: string;
  sub?: string;
  onClose: () => void;
  /** Pixel max-width when `panelMaxWidthClass` is not set. */
  width?: number;
  /** Tailwind max-width utility (e.g. `max-w-5xl`). Takes precedence over `width`. */
  panelMaxWidthClass?: string;
  /** Tailwind max-height utility for the panel (default `max-h-[90vh]`). */
  panelMaxHeightClass?: string;
  children: ReactNode;
};

/**
 * Centered modal overlay with title bar and scrollable body.
 */
export function Overlay(props: OverlayProps): ReactElement {
  const {
    title,
    sub,
    onClose,
    width = 500,
    panelMaxWidthClass,
    panelMaxHeightClass = 'max-h-[90vh]',
    children,
  } = props;
  const panelWidthStyle =
    panelMaxWidthClass === undefined ? { maxWidth: width } : undefined;
  const panelWidthClass =
    panelMaxWidthClass !== undefined ? `${panelMaxWidthClass} w-full` : 'w-full';
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/45 p-4 sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`flex ${panelMaxHeightClass} ${panelWidthClass} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`}
        style={panelWidthStyle}
        onClick={(e) => {
          e.stopPropagation();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="usd-overlay-title"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-gray-100 px-4 pb-3.5 pt-[18px] sm:px-6">
          <div className="min-w-0 flex-1">
            <div id="usd-overlay-title" className="text-base font-bold text-gray-900">
              {title}
            </div>
            {sub !== undefined ? (
              <div className="mt-0.5 text-[13px] text-gray-500">{sub}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-gray-100 text-lg text-gray-500"
            aria-label="Close dialog"
            data-testid="overlay-close"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
