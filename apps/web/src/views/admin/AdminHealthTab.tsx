import { StatusDot, usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import { useHealthDetail } from '../../hooks/useHealthDetail';
import { PanelSkeleton } from '../../components/skeletons/PanelSkeleton';

/**
 * System health cards from GET /api/health/detail.
 */
export function AdminHealthTab(): ReactElement {
  const { data, isLoading, isError } = useHealthDetail();

  if (isLoading) {
    return <PanelSkeleton title="System health" lines={4} />;
  }

  if (isError || data === undefined) {
    return (
      <p className="text-sm text-usd-red" role="alert">
        Unable to load health status.
      </p>
    );
  }

  const cards = [
    {
      label: 'DynamoDB',
      ok: data.dynamodb === 'connected',
      detail: data.dynamodb,
    },
    {
      label: 'Redis',
      ok: data.redis === 'connected',
      detail: data.redis,
    },
    {
      label: 'Postgres (KB)',
      ok: data.postgres === 'connected',
      detail: data.postgres,
    },
    {
      label: 'WebSocket',
      ok: data.status === 'ok',
      detail: `${String(data.websocket.connections)} connections`,
    },
    {
      label: 'API',
      ok: data.status === 'ok',
      detail: `v${data.version} · uptime ${String(Math.round(data.uptime))}s`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-xl border bg-white p-5 ${
            c.ok ? 'border-green-200' : 'border-red-200'
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            <StatusDot color={c.ok ? usdColors.teal : usdColors.red} size={10} />
            <span className="font-bold text-gray-900">{c.label}</span>
          </div>
          <p className={`text-sm font-semibold ${c.ok ? 'text-usd-teal' : 'text-usd-red'}`}>
            {c.ok ? 'Operational' : 'Degraded'}
          </p>
          <p className="mt-1 text-xs text-gray-500">{c.detail}</p>
        </div>
      ))}
    </div>
  );
}
