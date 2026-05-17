import type { ReactElement } from 'react';

export type StatusDotProps = {
  color: string;
  size?: number;
};

/**
 * Small coloured circle indicator.
 */
export function StatusDot(props: StatusDotProps): ReactElement {
  const { color, size = 8 } = props;
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  );
}
