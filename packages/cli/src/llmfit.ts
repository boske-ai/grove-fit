import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { LOCAL_TIERS, type BoskeLocalTier } from '@boske-labs/grove-fit-core';

const execFileAsync = promisify(execFile);

export const LLMFIT_INSTALL_URL = 'https://github.com/AlexsJones/llmfit#installation';

export const TIER_MATCHERS: Record<BoskeLocalTier, RegExp[]> = {
  seed: [/ministral.*3b/i, /3b.*instruct/i],
  branch: [/ministral.*8b/i, /8b.*instruct/i],
  canopy: [/ministral.*14b/i, /14b.*instruct/i],
  forest: [/mistral.small.*24/i, /magistral/i, /24b/i],
};

/**
 * Probe for llmfit and return its `system` output in one shot.
 *
 * The previous split (probe, then run the identical command again) spawned
 * llmfit twice for every scan/system/search, doubling the slowest step in the
 * CLI. Returns null when llmfit is unavailable or fails.
 */
export async function probeLlmfitSystemJson(timeoutMs = 15000): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('llmfit', ['--json', 'system'], {
      timeout: timeoutMs,
      maxBuffer: 4 * 1024 * 1024,
    });
    return stdout;
  } catch {
    return null;
  }
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
