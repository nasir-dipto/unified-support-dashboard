import type { ReactElement } from 'react';

export type BadgeProps = {
  label: string;
  color: string;
  sm?: boolean;
};

/**
 * Uppercase pill badge with coloured border and tinted background.
 */
export function Badge(props: BadgeProps): ReactElement {
  const { label, color, sm = false } = props;
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border-[1.5px] font-bold uppercase tracking-wide ${
        sm ? 'px-[7px] py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
      }`}
      style={{
        borderColor: color,
        backgroundColor: `${color}15`,
        color,
      }}
    >
      {label}
    </span>
  );
}
