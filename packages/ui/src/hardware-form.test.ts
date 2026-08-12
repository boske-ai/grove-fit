import { describe, expect, it } from 'vitest';
import {
  parseRamInput,
  parseVramInput,
  ramInputError,
  vramInputError,
} from './hardware-form.js';

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

describe('field errors', () => {
  it('explains why a value is rejected rather than discarding it silently', () => {
    expect(ramInputError('')).toMatch(/enter your system ram/i);
    expect(ramInputError('3')).toMatch(/between 4 and 256/i);
    expect(ramInputError('300')).toMatch(/between 4 and 256/i);
    expect(ramInputError('abc')).toMatch(/between 4 and 256/i);
  });

  it('reports no error for values the engine accepts', () => {
    expect(ramInputError('4')).toBeNull();
    expect(ramInputError('24')).toBeNull();
    expect(ramInputError('256')).toBeNull();
  });

  it('treats 0 VRAM as valid but empty VRAM as an error', () => {
    expect(vramInputError('0')).toBeNull();
    expect(vramInputError('')).toMatch(/or 0 if you have no gpu/i);
    expect(vramInputError('999')).toMatch(/between 0 and 128/i);
  });

  it('accepts intermediate values typed toward a valid one', () => {
    // "1" on the way to "16" is rejected, but the raw text is retained by the
    // form, so the user can finish typing — the old build reverted the field.
    expect(ramInputError('1')).not.toBeNull();
    expect(ramInputError('16')).toBeNull();
  });
});

describe('VRAM vs RAM cross-check', () => {
  it('rejects discrete VRAM larger than system RAM', () => {
    // assignMaxTier clamps this silently, so the user would get a verdict for
    // hardware they never described.
    expect(vramInputError('64', '16')).toMatch(/cannot exceed system RAM/i);
    expect(vramInputError('17', '16')).toMatch(/cannot exceed/i);
  });

  it('allows VRAM up to and including RAM', () => {
    expect(vramInputError('16', '16')).toBeNull();
    expect(vramInputError('8', '16')).toBeNull();
    expect(vramInputError('0', '16')).toBeNull();
  });

  it('skips the check when RAM is not supplied (unified memory)', () => {
    // Metal shares one pool, so VRAM >= RAM is legitimate there.
    expect(vramInputError('64')).toBeNull();
  });

  it('does not mask its own range error', () => {
    expect(vramInputError('999', '16')).toMatch(/between 0 and 128/i);
  });
});
