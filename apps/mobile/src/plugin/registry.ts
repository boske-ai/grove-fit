import { registerPlugin } from '@capacitor/core';
import type { NativeDetectRaw } from '@boske-labs/grove-fit-detect';

export interface GroveFitHardwarePlugin {
  detect(): Promise<NativeDetectRaw>;
}

export const GroveFitHardware = registerPlugin<GroveFitHardwarePlugin>('GroveFitHardware', {
  web: () => import('./web.js').then((m) => new m.GroveFitHardwareWeb()),
});
