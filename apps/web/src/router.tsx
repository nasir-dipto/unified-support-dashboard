import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AuthGuard } from './components/layout/AuthGuard';
import { LoginView } from './views/LoginView';

function Forbidden(): ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8 text-slate-800">
      <p>403 — insufficient permissions.</p>
    </div>
  );
}

function Home(): ReactElement {
  return (
    <p className="text-sm text-slate-600">
      Signed in. Navigation and modules will appear in later phases.
    </p>
  );
}

/**
 * Top-level browser routes with auth shell.
 */
export function AppRouter(): ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="/403" element={<Forbidden />} />
        <Route element={<AuthGuard />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
