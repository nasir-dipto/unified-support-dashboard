/**
 * True when the global demo build should show credential hints on the login page.
 */
export function shouldShowDemoHints(): boolean {
  if (import.meta.env.DEV) {
    return true;
  }
  const raw = import.meta.env.VITE_SHOW_DEMO_HINTS;
  return raw === 'true' || raw === '1';
}
