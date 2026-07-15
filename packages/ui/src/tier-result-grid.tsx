import { LOCAL_TIERS, type BoskeLocalTier, type FitLevel, type HardwareFitSnapshot } from '@boske-labs/grove-fit-core';
import { FitBadge } from './fit-badge.js';
import { TIER_ICONS, type CatalogModelEntry } from './types.js';

interface TierResultGridProps {
  snapshot: HardwareFitSnapshot;
  boskeTiers: CatalogModelEntry[];
}

function tierLabel(entry: CatalogModelEntry | undefined, tier: BoskeLocalTier): string {
  return entry?.label?.replace(/^Boske /, '') ?? tier;
}

export function TierResultGrid({ snapshot, boskeTiers }: TierResultGridProps) {
  const byTier = new Map(boskeTiers.map((e) => [e.tier, e]));
  const cloudTiers = boskeTiers.filter((e) => e.isCloud);

  return (
    <section className="gf-panel gf-boske-models">
      <h2>Boske models</h2>
      <p className="gf-panel-hint">Curated tiers for the Boske app</p>

      <ul className="gf-model-list">
        {LOCAL_TIERS.map((tier) => {
          const fit = snapshot.tierFit[tier] as FitLevel;
          const entry = byTier.get(tier);
          const isBest = tier === snapshot.recommendedTier;
          const name = tierLabel(entry, tier);
          const hint = entry?.upstreamHint;

          return (
            <li
              key={tier}
              className={`gf-model-row ${fit}${isBest ? ' recommended-pick' : ''}`}
            >
              <span className="gf-model-row-icon" aria-hidden>
                {entry?.icon ?? TIER_ICONS[tier]}
              </span>
              <div className="gf-model-row-content">
                <div className="gf-model-row-top">
                  <span className="gf-model-row-name">{name}</span>
                  {entry?.paramsB ? (
                    <span className="gf-model-row-size">{entry.paramsB}B</span>
                  ) : null}
                  {isBest ? <span className="gf-model-pick">Recommended</span> : null}
                  <FitBadge level={fit} size="sm" />
                </div>
                {hint ? <div className="gf-model-row-hint">{hint}</div> : null}
              </div>
            </li>
          );
        })}

        {cloudTiers.length > 0 ? (
          <li className="gf-model-row gf-model-row-label" aria-hidden>
            Cloud fallback
          </li>
        ) : null}

        {cloudTiers.map((entry) => (
          <li key={entry.id} className="gf-model-row cloud">
            <span className="gf-model-row-icon" aria-hidden>
              {entry.icon ?? '☁️'}
            </span>
            <div className="gf-model-row-content">
              <div className="gf-model-row-top">
                <span className="gf-model-row-name">{entry.label}</span>
                <span className="gf-model-row-cloud-tag">Cloud</span>
              </div>
              {entry.upstreamHint ? (
                <div className="gf-model-row-hint">{entry.upstreamHint}</div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
