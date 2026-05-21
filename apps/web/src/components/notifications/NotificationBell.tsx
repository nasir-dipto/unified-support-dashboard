import type { NotificationApiDto } from '@usd/shared-types';
import { usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  useMarkNotificationRead,
  useNotificationsList,
} from '../../hooks/useNotifications';
import { useNotificationsStore } from '../../store/notifications.store';

/**
 * Header bell with unread badge and dropdown of in-app notifications.
 */
export function NotificationBell(): ReactElement {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const query = useNotificationsList();
  const markRead = useMarkNotificationRead();
  const wsEvents = useNotificationsStore((s) => s.events);

  useEffect(() => {
    const onDoc = (e: MouseEvent): void => {
      if (panelRef.current !== null && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', onDoc);
    }
    return () => {
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open]);

  useEffect(() => {
    const latest = wsEvents[0];
    if (latest?.type === 'notification_created') {
      void query.refetch();
    }
  }, [wsEvents, query]);

  const unread = query.data?.unreadCount ?? 0;
  const items = query.data?.data ?? [];

  const onMarkRead = (n: NotificationApiDto): void => {
    if (n.readAt !== undefined && n.readAt !== null) {
      return;
    }
    void markRead.mutateAsync(n.notificationId);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => { setOpen((v) => !v); }}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-lg hover:bg-gray-50"
      >
        🔔
        {unread > 0 ? (
          <span
            className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
            style={{ backgroundColor: usdColors.red }}
          >
            {unread > 9 ? '9+' : String(unread)}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-10 z-[300] w-[320px] rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-3 py-2 text-xs font-bold uppercase text-gray-500">
            Notifications
          </div>
          <ul className="max-h-[320px] overflow-y-auto">
            {query.isLoading ? (
              <li className="px-3 py-4 text-sm text-gray-400">Loading…</li>
            ) : null}
            {!query.isLoading && items.length === 0 ? (
              <li className="px-3 py-4 text-sm text-gray-400">No notifications yet.</li>
            ) : null}
            {items.map((n) => (
              <li key={n.notificationId} className="border-b border-gray-50 px-3 py-2">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => { onMarkRead(n); }}
                >
                  <div className="text-xs font-bold text-gray-900">{n.title}</div>
                  <div className="text-xs text-gray-600">{n.message}</div>
                  <div className="mt-0.5 text-[10px] text-gray-400">
                    {n.readAt !== undefined && n.readAt !== null ? 'Read' : 'Mark read'}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
