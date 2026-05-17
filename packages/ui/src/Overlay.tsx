import type { ReactElement, ReactNode } from 'react';

export type OverlayProps = {
  title: string;
  sub?: string;
  onClose: () => void;
  width?: number;
  children: ReactNode;
};

/**
 * Centered modal overlay with title bar and scrollable body.
 */
export function Overlay(props: OverlayProps): ReactElement {
  const { title, sub, onClose, width = 500, children } = props;
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/45 p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl"
        style={{ maxWidth: width }}
        onClick={(e) => {
          e.stopPropagation();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="usd-overlay-title"
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-6 pb-3.5 pt-[18px]">
          <div>
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
            className="ml-3 flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-gray-100 text-lg text-gray-500"
            aria-label="Close dialog"
            data-testid="overlay-close"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
