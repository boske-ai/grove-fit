import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  buildHardwareFitSnapshot,
  LOCAL_TIERS,
  type BoskeLocalTier,
} from '@boske-labs/grove-fit-core';
import { hardwareProfileToSystemInfo, parseLlmfitSystemJson } from '@boske-labs/grove-fit-detect';

const execFileAsync = promisify(execFile);

export const LLMFIT_INSTALL_URL = 'https://github.com/AlexsJones/llmfit#installation';

export const TIER_MATCHERS: Record<BoskeLocalTier, RegExp[]> = {
  seed: [/ministral.*3b/i, /3b.*instruct/i],
  branch: [/ministral.*8b/i, /8b.*instruct/i],
  canopy: [/ministral.*14b/i, /14b.*instruct/i],
  forest: [/mistral.small.*24/i, /magistral/i, /24b/i],
};

export async function probeLlmfit(timeoutMs = 5000): Promise<boolean> {
  try {
    await execFileAsync('llmfit', ['--json', 'system'], { timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

export async function runLlmfitSystemJson(): Promise<string> {
  const { stdout } = await execFileAsync('llmfit', ['--json', 'system'], {
    timeout: 15000,
    maxBuffer: 4 * 1024 * 1024,
  });
  return stdout;
}

export async function runLlmfitRecommend(all: boolean, limit = 50): Promise<string> {
  const args = ['recommend', '--json', '--limit', String(limit)];
  if (all) {
    args.push('--all');
  }
  const { stdout } = await execFileAsync('llmfit', args, {
    timeout: 120000,
    maxBuffer: 20 * 1024 * 1024,
  });
  return stdout;
}

export async function runLlmfitSearch(query: string): Promise<string> {
  const { stdout } = await execFileAsync('llmfit', ['search', query, '--json'], {
    timeout: 60000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

export function matchTierFromName(name: string): BoskeLocalTier | null {
  for (const tier of LOCAL_TIERS) {
    if (TIER_MATCHERS[tier].some((re) => re.test(name))) {
      return tier;
    }
  }
  return null;
}

export function normalizeRecommendEntries(stdout: string): Array<Record<string, unknown>> {
  const parsed = JSON.parse(stdout) as unknown;
  if (Array.isArray(parsed)) return parsed as Array<Record<string, unknown>>;
  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>;
    for (const key of ['fits', 'recommendations', 'models']) {
      if (Array.isArray(record[key])) {
        return record[key] as Array<Record<string, unknown>>;
      }
    }
  }
  return [];
}

export async function buildScanSnapshot() {
  const stdout = await runLlmfitSystemJson();
  const profile = parseLlmfitSystemJson(stdout);
  const snapshot = buildHardwareFitSnapshot(hardwareProfileToSystemInfo(profile));
  return { profile, snapshot };
}
