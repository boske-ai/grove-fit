import { describe, expect, it } from 'vitest';
import { isTauriDesktop } from './detect-hardware.js';

describe('isTauriDesktop', () => {
  it('is false outside Tauri (no __TAURI_INTERNALS__)', () => {
    expect(isTauriDesktop()).toBe(false);
  });
});
