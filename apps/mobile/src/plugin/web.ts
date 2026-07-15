import { WebPlugin } from '@capacitor/core';
import type { NativeDetectRaw } from '@boske-labs/grove-fit-detect';
import type { GroveFitHardwarePlugin } from './registry.js';

export class GroveFitHardwareWeb extends WebPlugin implements GroveFitHardwarePlugin {
  async detect(): Promise<NativeDetectRaw> {
    const ramGB = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    return {
      totalMemoryBytes: Math.round(ramGB * 1024 ** 3),
      platform: 'android',
    };
  }
}
