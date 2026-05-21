import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotificationBell } from './NotificationBell';

vi.mock('../../hooks/useNotifications', () => ({
  useNotificationsList: () => ({
    data: { data: [], unreadCount: 2, total: 0 },
    isLoading: false,
    refetch: vi.fn(),
  }),
  useMarkNotificationRead: () => ({ mutateAsync: vi.fn() }),
}));

describe('NotificationBell', () => {
  it('renders bell with unread badge', () => {
    render(<NotificationBell />);
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
