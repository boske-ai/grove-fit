import {
  buildFunnelComparison,
  suggestBoskeTierForParams,
  type FunnelComparison,
} from '@boske-labs/grove-fit-core';
import type { HardwareFitSnapshot } from '@boske-labs/grove-fit-core';
import { FitBadge, fitSummaryLine } from './fit-badge.js';
import { GroveFitCertifiedBadge } from './grove-fit-certified-badge.js';
import { TIER_ICONS, type CatalogModelEntry } from './types.js';

interface ModelResultPanelProps {
  model: CatalogModelEntry;
  snapshot: HardwareFitSnapshot;
  funnel?: FunnelComparison | null;
  onClose?: () => void;
}

function tierDisplayName(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function ModelResultPanel({ model, snapshot, funnel, onClose }: ModelResultPanelProps) {
  const comparison =
    funnel ??
    buildFunnelComparison(
      {
        id: model.id,
        label: model.label,
        paramsB: model.paramsB ?? null,
        minRAMGB: model.minRAMGB,
        groveFitCertified: model.groveFitCertified,
        isCloud: model.isCloud,
      },
      snapshot,
    );

  const sizeClass = suggestBoskeTierForParams(model.paramsB ?? 0);
  const modelFit = comparison.fitLevel;
  const boskeFit = comparison.suggestedBoskeFitLevel;

  return (
    <div className="gf-model-result">
      <div className="gf-model-result-header">
        <div>
          <div className="gf-model-name">{model.label}</div>
          <div className="gf-model-meta">
            {model.paramsB ? `${model.paramsB}B` : 'Unknown size'}
            {model.minRAMGB ? ` · ~${model.minRAMGB} GB RAM` : ''}
          </div>
        </div>
        {onClose ? (
          <button type="button" className="gf-icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        ) : null}
      </div>

      <div className="gf-verdict">
        <div className="gf-verdict-row">
          <span className="gf-verdict-label">On your machine</span>
          <FitBadge level={modelFit} />
        </div>
        <p className="gf-verdict-copy">{fitSummaryLine(modelFit)}</p>
      </div>

      <div className="gf-divider" />

      <div className="gf-verdict gf-verdict-secondary">
        <div className="gf-verdict-row">
          <span className="gf-verdict-label">
            Similar Boske tier · {TIER_ICONS[sizeClass]} {tierDisplayName(sizeClass)}
          </span>
          <FitBadge level={boskeFit} size="sm" />
        </div>
        <div className="gf-verdict-foot">
          <GroveFitCertifiedBadge />
          <span className="gf-verdict-hint">Curated for the Boske app — same size class.</span>
        </div>
      </div>
    </div>
  );
}
