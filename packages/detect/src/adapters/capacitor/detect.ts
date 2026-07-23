import { Capacitor } from '@capacitor/core';
import { parseNativeDetectRaw, type NativeDetectRaw } from '../native.js';
import type { HardwareProfile } from '../../types.js';
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
