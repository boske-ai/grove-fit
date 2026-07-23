import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHardwareFitSnapshot, type BoskeLocalTier, type FitLevel } from '@boske-labs/grove-fit-core';
import { hardwareProfileToSystemInfo } from '@boske-labs/grove-fit-detect';
import type { HardwareProfile } from '@boske-labs/grove-fit-detect';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '..', 'fixtures');

export interface ConformanceFixture {
  id: string;
  description: string;
  profile: HardwareProfile;
  expected: {
    recommendedTier: BoskeLocalTier;
    tierFit: Record<BoskeLocalTier, FitLevel>;
  };
}

export function loadFixtures(): ConformanceFixture[] {
  const files = [
    '8gb-cpu-only.json',
    '32gb-metal.json',
    '16gb-cuda-8vram.json',
    'android-8gb-unified.json',
    'android-16gb-unified.json',
    'ios-6gb-unified.json',
    'webgpu-16gb-hint.json',
  ];
  return files.map((file) => {
    const raw = readFileSync(join(FIXTURES_DIR, file), 'utf8');
    return JSON.parse(raw) as ConformanceFixture;
  });
}

export function runFixture(fixture: ConformanceFixture) {
  const systemInfo = hardwareProfileToSystemInfo(fixture.profile);
  const snapshot = buildHardwareFitSnapshot(systemInfo);
  return snapshot;
}
