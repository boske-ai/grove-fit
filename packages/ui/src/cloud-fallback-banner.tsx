import type { HardwareFitSnapshot } from '@boske-labs/grove-fit-core';
import { LOCAL_TIERS } from '@boske-labs/grove-fit-core';

interface CloudFallbackBannerProps {
  snapshot: HardwareFitSnapshot;
}

export function CloudFallbackBanner({ snapshot }: CloudFallbackBannerProps) {
  const anyLocalOk = LOCAL_TIERS.some(
    (t) => snapshot.tierFit[t] === 'recommended' || snapshot.tierFit[t] === 'marginal',
  );
  if (anyLocalOk) return null;

  return (
    <div className="gf-cloud-banner">
      <strong>No local tier fits comfortably.</strong>
      <p style={{ margin: '0.5rem 0 0' }}>
        Try <strong>Boske Cloud (Breeze)</strong> — fast, no download. Summit for maximum quality.
      </p>
    </div>
  );
}
