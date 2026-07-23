import { describe, expect, it } from 'vitest';
import { parseRamInput, parseVramInput } from './hardware-form.js';

describe('parseRamInput', () => {
  it('returns null for empty or NaN instead of inventing 8GB', () => {
    expect(parseRamInput('')).toBeNull();
    expect(parseRamInput('   ')).toBeNull();
    expect(parseRamInput('abc')).toBeNull();
  });

  it('accepts finite values in range', () => {
    expect(parseRamInput('16')).toBe(16);
    expect(parseRamInput('4')).toBe(4);
  });

  it('rejects out of range', () => {
    expect(parseRamInput('3')).toBeNull();
    expect(parseRamInput('300')).toBeNull();
  });
});

describe('parseVramInput', () => {
  it('returns null for empty instead of coercing to 0', () => {
    expect(parseVramInput('')).toBeNull();
  });

  it('accepts explicit 0', () => {
    expect(parseVramInput('0')).toBe(0);
  });
});
