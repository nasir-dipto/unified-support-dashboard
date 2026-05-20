import type { TicketSentiment } from '@usd/shared-types';
import { Badge, sentimentColors } from '@usd/ui';
import type { ReactElement } from 'react';

export type SentimentBadgeProps = {
  sentiment: TicketSentiment | null | undefined;
  sm?: boolean;
};

/**
 * Displays sentiment label for Helpdesk tickets (hidden when unset).
 */
export function SentimentBadge(props: SentimentBadgeProps): ReactElement {
  const { sentiment, sm = true } = props;
  if (sentiment === undefined || sentiment === null) {
    return <></>;
  }
  const color = sentimentColors[sentiment] ?? '#6B7280';
  return <Badge label={sentiment} color={color} sm={sm} />;
}
