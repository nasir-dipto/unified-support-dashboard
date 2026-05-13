import { describe, expect, it } from 'vitest';
import { ensureSupportTablesExist } from './create-tables.js';

describe('ensureSupportTablesExist', () => {
  it('is exported', () => {
    expect(typeof ensureSupportTablesExist).toBe('function');
  });
});
