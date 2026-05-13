import { Stub } from '@usd/ui';

/**
 * Root layout for the web app shell (Phase 0 scaffold).
 */
export function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-8 text-slate-900">
      <h1 className="text-3xl font-semibold tracking-tight">Hello World</h1>
      <Stub />
    </main>
  );
}
