import type { ReactElement } from 'react';

export type KbBrowseSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Search input for the KB browse page.
 */
export function KbBrowseSearch(props: KbBrowseSearchProps): ReactElement {
  const { value, onChange } = props;
  return (
    <input
      type="search"
      placeholder="Search published articles…"
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      className="w-full max-w-md rounded-lg border border-gray-200 px-3 py-2 text-sm"
    />
  );
}
