import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AuthGuard } from './components/layout/AuthGuard';
import { RoleGuard } from './components/layout/RoleGuard';
import { AcceptInviteView } from './views/AcceptInviteView';
import { AdminPanelView } from './views/AdminPanelView';
import { ForgotPasswordView } from './views/ForgotPasswordView';
import { KbArticleView } from './views/KbArticleView';
import { KnowledgeBaseView } from './views/KnowledgeBaseView';
import { LoginView } from './views/LoginView';
import { ManagerDashboardView } from './views/ManagerDashboardView';
import { ResetPasswordView } from './views/ResetPasswordView';
import { TechnicianTicketsView } from './views/TechnicianTicketsView';
import { TicketDetailView } from './views/TicketDetailView';

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
        <Route path="/forgot-password" element={<ForgotPasswordView />} />
        <Route path="/reset-password" element={<ResetPasswordView />} />
        <Route path="/accept-invite" element={<AcceptInviteView />} />
        <Route path="/403" element={<Forbidden />} />
        <Route element={<AuthGuard />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/tickets" replace />} />
            <Route
              path="/tickets"
              element={
                <RoleGuard allow={['technician', 'manager', 'super_admin']}>
                  <TechnicianTicketsView />
                </RoleGuard>
              }
            />
            <Route
              path="/tickets/:ticketId"
              element={
                <RoleGuard allow={['technician', 'manager', 'super_admin']}>
                  <TicketDetailView />
                </RoleGuard>
              }
            />
            <Route
              path="/kb"
              element={
                <RoleGuard allow={['technician', 'manager', 'super_admin']}>
                  <KnowledgeBaseView />
                </RoleGuard>
              }
            />
            <Route
              path="/kb/:kbId"
              element={
                <RoleGuard allow={['technician', 'manager', 'super_admin']}>
                  <KbArticleView />
                </RoleGuard>
              }
            />
            <Route
              path="/manager"
              element={
                <RoleGuard allow={['manager', 'super_admin']}>
                  <ManagerDashboardView />
                </RoleGuard>
              }
            />
            <Route
              path="/admin"
              element={
                <RoleGuard allow={['super_admin']}>
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
