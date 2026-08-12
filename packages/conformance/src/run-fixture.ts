import { readdirSync, readFileSync } from 'node:fs';
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

/**
 * Every fixture in the directory, discovered rather than listed.
 *
 * A hardcoded filename list silently skips any fixture someone adds — the whole
 * point of the directory is that dropping a file in extends the contract.
 */
export function loadFixtures(): ConformanceFixture[] {
  const files = readdirSync(FIXTURES_DIR)
    .filter((file) => file.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    throw new Error(`No conformance fixtures found in ${FIXTURES_DIR}`);
  }

  return files.map((file) => {
    const raw = readFileSync(join(FIXTURES_DIR, file), 'utf8');
    const fixture = JSON.parse(raw) as ConformanceFixture;
    if (!fixture.id || !fixture.profile || !fixture.expected) {
      throw new Error(`Malformed conformance fixture: ${file}`);
    }
    return fixture;
  });
}

export function runFixture(fixture: ConformanceFixture) {
  const systemInfo = hardwareProfileToSystemInfo(fixture.profile);
  const snapshot = buildHardwareFitSnapshot(systemInfo);
  return snapshot;
}
