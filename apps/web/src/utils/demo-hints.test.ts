import { afterEach, describe, expect, it, vi } from 'vitest';
import { shouldShowDemoHints } from './demo-hints';

describe('shouldShowDemoHints', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns true in dev mode', () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_SHOW_DEMO_HINTS', undefined);
    expect(shouldShowDemoHints()).toBe(true);
  });

  it('returns true when VITE_SHOW_DEMO_HINTS is set in production', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SHOW_DEMO_HINTS', 'true');
    expect(shouldShowDemoHints()).toBe(true);
  });

  it('returns false in production without flag', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SHOW_DEMO_HINTS', undefined);
    expect(shouldShowDemoHints()).toBe(false);
  });
});
