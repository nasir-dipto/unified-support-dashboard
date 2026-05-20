import { describe, expect, it } from 'vitest';
import { parseModelJson } from './parseModelJson.js';

describe('parseModelJson', () => {
  it('parses plain JSON object', () => {
    const out = parseModelJson('{"engineerAction":"Do X"}');
    expect(out.engineerAction).toBe('Do X');
  });

  it('parses fenced JSON block', () => {
    const out = parseModelJson('```json\n{"draft":"Hi"}\n```');
    expect(out.draft).toBe('Hi');
  });

  it('throws on non-object', () => {
    expect(() => parseModelJson('"hello"')).toThrow();
  });
});
