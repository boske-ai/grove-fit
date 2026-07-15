import type { BoskeLocalTier, FitLevel, HardwareFitSnapshot } from '@boske-labs/grove-fit-core';
import { LOCAL_TIERS } from '@boske-labs/grove-fit-core';
import type { HardwareProfile } from '@boske-labs/grove-fit-detect';

export const supportsColor =
  Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function paint(text: string, ...codes: string[]): string {
  if (!supportsColor || codes.length === 0) return text;
  return `${codes.join('')}${text}${c.reset}`;
}

export const FIT_COLORS: Record<FitLevel, string> = {
  recommended: c.green,
  marginal: c.yellow,
  unavailable: c.red,
};

export const FIT_LABELS: Record<FitLevel, string> = {
  recommended: 'Recommended',
  marginal: 'Marginal',
  unavailable: 'Unavailable',
};

export function formatFitLevel(level: FitLevel): string {
  return paint(FIT_LABELS[level], FIT_COLORS[level], c.bold);
}

export function formatTierName(tier: BoskeLocalTier | string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function formatHardwareSummary(profile: HardwareProfile): string {
  const ram = `${profile.totalRAMGB} GB RAM`;
  const vram =
    profile.gpuMemoryGB != null && profile.gpuMemoryGB > 0
      ? `${profile.gpuMemoryGB} GB VRAM`
      : null;
  const gpu = profile.gpuName ? profile.gpuName : null;
  const backend = profile.gpuBackend.toUpperCase();
  const parts = [ram, vram, gpu, backend].filter(Boolean);
  return parts.join(' · ');
}

export function formatScanOutput(
  snapshot: HardwareFitSnapshot,
  profile: HardwareProfile,
  source: string,
): string {
  const lines: string[] = [
    paint('Grove Fit', c.bold, c.cyan),
    paint(formatHardwareSummary(profile), c.dim),
    `Source: ${source}`,
    '',
    paint('Boske tier fit', c.bold),
  ];

  for (const tier of LOCAL_TIERS) {
    const level = snapshot.tierFit[tier];
    const tierLabel = formatTierName(tier).padEnd(8);
    lines.push(`  ${tierLabel} ${formatFitLevel(level)}`);
  }

  lines.push('');
  lines.push(
    `${paint('Recommended tier', c.bold)}: ${paint(formatTierName(snapshot.recommendedTier), c.magenta, c.bold)}`,
  );
  return lines.join('\n');
}

export function formatSystemOutput(
  snapshot: HardwareFitSnapshot,
  profile: HardwareProfile,
  source: string,
): string {
  const lines: string[] = [
    paint('System', c.bold, c.cyan),
    '',
    `  Platform     ${profile.platform}`,
    `  RAM          ${profile.totalRAMGB} GB`,
  ];

  if (profile.availableRAMGB != null) {
    lines.push(`  Available    ${profile.availableRAMGB} GB`);
  }
  if (profile.gpuMemoryGB != null && profile.gpuMemoryGB > 0) {
    lines.push(`  VRAM         ${profile.gpuMemoryGB} GB`);
  }
  if (profile.gpuName) {
    lines.push(`  GPU          ${profile.gpuName}`);
  }
  lines.push(`  Backend      ${profile.gpuBackend}`);
  if (profile.cpuCores != null) {
    lines.push(`  CPU cores    ${profile.cpuCores}`);
  }
  lines.push(`  Source       ${source}`);
  lines.push('');
  lines.push(paint('Tier fit grid', c.bold));

  for (const tier of LOCAL_TIERS) {
    const level = snapshot.tierFit[tier];
    lines.push(`  ${formatTierName(tier).padEnd(8)} ${formatFitLevel(level)}`);
  }

  lines.push('');
  lines.push(
    `${paint('Recommended', c.bold)}: ${paint(formatTierName(snapshot.recommendedTier), c.magenta, c.bold)}`,
  );
  return lines.join('\n');
}

export function formatSearchResultLine(
  label: string,
  fitLevel: FitLevel,
  extras?: { tier?: string; paramsB?: number | null; isBoske?: boolean },
): string {
  const fit = formatFitLevel(fitLevel);
  const meta: string[] = [];
  if (extras?.paramsB != null) meta.push(`${extras.paramsB}B`);
  if (extras?.tier) meta.push(formatTierName(extras.tier));
  if (extras?.isBoske) meta.push('Boske');
  const suffix = meta.length > 0 ? paint(` (${meta.join(' · ')})`, c.dim) : '';
  return `  ${fit.padEnd(supportsColor ? 22 : 12)} ${label}${suffix}`;
}

export function paintAttribution(source: 'llmfit' | 'native'): string {
  if (source === 'llmfit') {
    return paint('Powered by llmfit (MIT)', c.dim);
  }
  return paint('Native hardware probe (install llmfit for richer GPU data)', c.dim);
}
