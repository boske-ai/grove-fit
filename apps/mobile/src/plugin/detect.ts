import { Capacitor } from '@capacitor/core';
import {
  parseNativeDetectRaw,
  type HardwareProfile,
  type NativeDetectRaw,
} from '@boske-labs/grove-fit-detect';
import { GroveFitHardware } from './registry.js';

export async function detectMobileHardware(): Promise<HardwareProfile | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const raw = await GroveFitHardware.detect();
    return parseNativeDetectRaw(raw);
  } catch (error) {
    console.warn('[Grove Fit] mobile detect failed:', error);
    return null;
  }
}

export type { NativeDetectRaw };
