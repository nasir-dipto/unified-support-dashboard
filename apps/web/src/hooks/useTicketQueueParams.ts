import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { TicketQueueParams } from '../utils/ticket-queue-params';
import {
  mergeTicketQueueParams,
  parseTicketQueueParams,
  ticketQueueParamsToSearchParams,
} from '../utils/ticket-queue-params';

/**
 * URL-backed ticket queue filter/pagination state (react-router search params).
 */
export function useTicketQueueParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo(
    () => parseTicketQueueParams(searchParams),
    [searchParams],
  );

  const setParams = useCallback(
    (patch: Partial<TicketQueueParams>) => {
      const next = mergeTicketQueueParams(params, patch);
      setSearchParams(ticketQueueParamsToSearchParams(next), { replace: true });
    },
    [params, setSearchParams],
  );

  return { params, setParams };
}
