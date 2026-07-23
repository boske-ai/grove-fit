import { WebPlugin } from '@capacitor/core';
import type { NativeDetectRaw } from '../native.js';
import type { GroveFitHardwarePlugin } from './registry.js';

export class GroveFitHardwareWeb extends WebPlugin implements GroveFitHardwarePlugin {
  async detect(): Promise<NativeDetectRaw> {
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (typeof deviceMemory !== 'number' || !Number.isFinite(deviceMemory) || deviceMemory <= 0) {
      throw new Error('navigator.deviceMemory unavailable for web Capacitor stub');
    }
    return {
      totalMemoryBytes: Math.round(deviceMemory * 1024 ** 3),
      platform: 'android',
    };
  }
}
