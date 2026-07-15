import { buildHardwareFitSnapshot } from '@boske-labs/grove-fit-core';
import {
  hardwareProfileToSystemInfo,
  parseLlmfitSystemJson,
  type HardwareProfile,
} from '@boske-labs/grove-fit-detect';
import type { HardwareFitSnapshot } from '@boske-labs/grove-fit-core';
import { detectNativeProfile } from './native-detect.js';
import { probeLlmfit, runLlmfitSystemJson } from './llmfit.js';

export interface DetectHardwareResult {
  profile: HardwareProfile;
  snapshot: HardwareFitSnapshot;
  source: 'llmfit' | 'native';
}

export async function detectHardware(): Promise<DetectHardwareResult> {
  if (await probeLlmfit()) {
    const stdout = await runLlmfitSystemJson();
    const profile = parseLlmfitSystemJson(stdout);
    const snapshot = buildHardwareFitSnapshot(hardwareProfileToSystemInfo(profile));
    return { profile, snapshot, source: 'llmfit' };
  }

  const profile = await detectNativeProfile();
  const snapshot = buildHardwareFitSnapshot(hardwareProfileToSystemInfo(profile));
  return { profile, snapshot, source: 'native' };
}
