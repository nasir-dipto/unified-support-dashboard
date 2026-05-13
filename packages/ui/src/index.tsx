import type { ReactElement, ReactNode } from 'react';

export type StubProps = {
  children?: ReactNode;
};

/**
 * Placeholder component for the shared UI package.
 */
export function Stub(props: StubProps): ReactElement {
  const { children } = props;
  return <span data-testid="usd-ui-stub">{children ?? 'USD UI'}</span>;
}
