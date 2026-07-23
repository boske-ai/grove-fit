import { registerPlugin } from '@capacitor/core';
import type { NativeDetectRaw } from '../native.js';

export interface GroveFitHardwarePlugin {
  detect(): Promise<NativeDetectRaw>;
}

export const GroveFitHardware = registerPlugin<GroveFitHardwarePlugin>('GroveFitHardware', {
  web: () => import('./web.js').then((m) => new m.GroveFitHardwareWeb()),
});
