import { describe, expect, it, vi, afterEach } from 'vitest';
import { enqueueSqsEvent } from './enqueueSqsEvent.js';

describe('enqueueSqsEvent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs without throwing', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    expect(() => {
      enqueueSqsEvent('jira.webhook', { ok: true });
    }).not.toThrow();
    expect(spy).toHaveBeenCalled();
  });
});
