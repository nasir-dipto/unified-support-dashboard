import type { ReactElement } from 'react';
import { useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { canManageKnowledgeBase } from '../utils/roles';
import { AdminHealthTab } from './admin/AdminHealthTab';
import { AdminKbTab } from './admin/AdminKbTab';
import { AdminIntegrationsTab } from './admin/AdminIntegrationsTab';
import { AdminSettingsTab } from './admin/AdminSettingsTab';
import { AdminSmtpTab } from './admin/AdminSmtpTab';
import { AdminUsersTab } from './admin/AdminUsersTab';

type AdminTab = 'users' | 'jira' | 'me' | 'smtp' | 'settings' | 'health' | 'kb';

/**
 * Admin panel (AdminView) with configuration tabs.
 */
export function AdminPanelView(): ReactElement {
  const [tab, setTab] = useState<AdminTab>('users');
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const showKb = canManageKnowledgeBase(roles);
  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'users', label: 'Users' },
    { id: 'jira', label: 'Jira' },
    { id: 'me', label: 'ManageEngine' },
    { id: 'smtp', label: 'SMTP' },
    { id: 'settings', label: 'Settings' },
    { id: 'health', label: 'Health' },
    ...(showKb ? [{ id: 'kb' as const, label: 'Knowledge Base' }] : []),
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
        {tab === 'settings' ? <AdminSettingsTab /> : null}
        {tab === 'health' ? <AdminHealthTab /> : null}
        {tab === 'kb' ? <AdminKbTab /> : null}
      </div>
    </>
  );
}
