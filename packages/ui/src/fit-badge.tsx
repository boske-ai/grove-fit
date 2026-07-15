import type { FitLevel } from '@boske-labs/grove-fit-core';

interface FitBadgeProps {
  level: FitLevel;
  size?: 'sm' | 'md';
}

const CONFIG: Record<FitLevel, { label: string; short: string; className: string }> = {
  recommended: { label: 'Runs well', short: 'OK', className: 'gf-fit-ok' },
  marginal: { label: 'Tight / slow', short: 'Tight', className: 'gf-fit-warn' },
  unavailable: { label: "Won't run", short: 'No', className: 'gf-fit-no' },
};

export function FitBadge({ level, size = 'md' }: FitBadgeProps) {
  const cfg = CONFIG[level];
  return (
    <span className={`gf-fit-badge ${cfg.className} gf-fit-badge-${size}`}>
      {size === 'sm' ? cfg.short : cfg.label}
    </span>
  );
}

export function fitSummaryLine(level: FitLevel): string {
  switch (level) {
    case 'recommended':
      return 'Should run comfortably on this machine.';
    case 'marginal':
      return 'May run, but expect slow or tight memory.';
    case 'unavailable':
      return 'Not enough RAM or GPU for this model size.';
  }
}
