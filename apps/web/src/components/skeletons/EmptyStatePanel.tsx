import type { ReactElement } from 'react';

export type EmptyStatePanelProps = {
  title: string;
  description?: string;
};

/**
 * Styled empty / coming-soon panel matching design layout.
 */
export function EmptyStatePanel(props: EmptyStatePanelProps): ReactElement {
  const { title, description } = props;
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
      <p className="text-sm font-bold text-gray-700">{title}</p>
      {description !== undefined ? (
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      ) : null}
    </div>
  );
}
