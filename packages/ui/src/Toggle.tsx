import type { ReactElement } from 'react';
import { usdColors } from './tokens/colors.js';

export type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/**
 * Indigo toggle switch matching design reference.
 */
export function Toggle(props: ToggleProps): ReactElement {
  const { checked, onChange } = props;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        onChange(!checked);
      }}
      className="relative h-5 w-[38px] shrink-0 cursor-pointer rounded-full transition-colors"
      style={{ backgroundColor: checked ? usdColors.indigo : '#d1d5db' }}
    >
      <span
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left]"
        style={{ left: checked ? 19 : 2 }}
      />
    </button>
  );
}
