import type { ReactElement } from 'react';
import { useState } from 'react';
import { AdminHealthTab } from './admin/AdminHealthTab';
import { AdminIntegrationsTab } from './admin/AdminIntegrationsTab';
import { AdminSmtpTab } from './admin/AdminSmtpTab';
import { AdminUsersTab } from './admin/AdminUsersTab';

type AdminTab = 'users' | 'jira' | 'me' | 'smtp' | 'health';

/**
 * Admin panel (AdminView) with configuration tabs.
 */
export function AdminPanelView(): ReactElement {
  const [tab, setTab] = useState<AdminTab>('users');
  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'users', label: 'Users' },
    { id: 'jira', label: 'Jira' },
    { id: 'me', label: 'ManageEngine' },
    { id: 'smtp', label: 'SMTP' },
    { id: 'health', label: 'Health' },
  ];

  return (
    <>
      <h1 className="text-[26px] font-extrabold text-gray-900">Admin Panel</h1>
      <p className="mb-5 text-sm text-gray-500">
        Manage users, integrations, SMTP and system settings.
      </p>

      <div className="-mb-px flex flex-wrap gap-1 border-b-2 border-gray-100">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); }}
            className={`border-b-[3px] px-4 py-2 text-[13px] ${
              tab === t.id
                ? 'border-usd-indigo font-bold text-usd-indigo'
                : 'border-transparent font-medium text-gray-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'users' ? <AdminUsersTab /> : null}
        {tab === 'jira' || tab === 'me' ? <AdminIntegrationsTab /> : null}
        {tab === 'smtp' ? <AdminSmtpTab /> : null}
        {tab === 'health' ? <AdminHealthTab /> : null}
      </div>
    </>
  );
}
