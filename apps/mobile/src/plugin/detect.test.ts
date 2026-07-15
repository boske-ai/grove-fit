import { describe, expect, it } from 'vitest';
import { parseNativeDetectRaw } from '@boske-labs/grove-fit-detect';

describe('mobile native detect bridge', () => {
  it('maps iOS physicalMemory bytes to seed-tier profile', () => {
    const profile = parseNativeDetectRaw({
      platform: 'ios',
      totalMemoryBytes: 6 * 1024 ** 3,
    });
    expect(profile.platform).toBe('ios');
    expect(profile.gpuBackend).toBe('metal');
    expect(profile.source).toBe('native');
  });

  it('maps Android ActivityManager bytes to vulkan unified profile', () => {
    const profile = parseNativeDetectRaw({
      platform: 'android',
      totalMemoryBytes: 8 * 1024 ** 3,
      availableMemoryBytes: 3 * 1024 ** 3,
    });
    expect(profile.platform).toBe('android');
    expect(profile.gpuBackend).toBe('vulkan');
    expect(profile.totalRAMGB).toBe(8);
    expect(profile.gpuMemoryGB).toBe(2);
  });
});
