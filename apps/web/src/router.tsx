import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AuthGuard } from './components/layout/AuthGuard';
import { RoleGuard } from './components/layout/RoleGuard';
import { AdminPanelView } from './views/AdminPanelView';
import { LoginView } from './views/LoginView';
import { ManagerDashboardView } from './views/ManagerDashboardView';
import { TechnicianTicketsView } from './views/TechnicianTicketsView';

function Forbidden(): ReactElement {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-gray-700">
      <p>403 — insufficient permissions.</p>
    </div>
  );
}

/**
 * Top-level browser routes with role-based views.
 */
export function AppRouter(): ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="/403" element={<Forbidden />} />
        <Route element={<AuthGuard />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/tickets" replace />} />
            <Route
              path="/tickets"
              element={
                <RoleGuard allow={['viewer', 'agent', 'admin']}>
                  <TechnicianTicketsView />
                </RoleGuard>
              }
            />
            <Route
              path="/manager"
              element={
                <RoleGuard allow={['admin']}>
                  <ManagerDashboardView />
                </RoleGuard>
              }
            />
            <Route
              path="/admin"
              element={
                <RoleGuard allow={['admin']}>
                  <AdminPanelView />
                </RoleGuard>
              }
            />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
