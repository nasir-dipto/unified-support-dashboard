import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UsersTable } from './UsersTable.js';

describe('UsersTable', () => {
  it('renders user rows', () => {
    render(
      <UsersTable
        users={[
          {
            userId: '1',
            email: 'tech@usd.dev',
            role: 'technician',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ]}
      />,
    );
    expect(screen.getByText('tech@usd.dev')).toBeInTheDocument();
  });
});
