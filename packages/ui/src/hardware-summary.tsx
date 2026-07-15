import type { HardwareProfile } from '@boske-labs/grove-fit-detect';

interface HardwareSummaryProps {
  profile: HardwareProfile;
  isScanning?: boolean;
  onEdit?: () => void;
}

export function HardwareSummary({ profile, isScanning, onEdit }: HardwareSummaryProps) {
  return (
    <div className={`gf-machine-strip ${isScanning ? 'gf-scanning' : ''}`}>
      <div className="gf-stat-row">
        <span className="gf-chip">{profile.totalRAMGB} GB RAM</span>
        <span className="gf-chip">{profile.gpuMemoryGB ?? 0} GB VRAM</span>
        <span className="gf-chip gf-chip-muted">{profile.gpuBackend}</span>
        {profile.gpuName ? <span className="gf-chip gf-chip-muted">{profile.gpuName}</span> : null}
      </div>
      {onEdit ? (
        <button type="button" className="gf-link-btn" onClick={onEdit}>
          Edit
        </button>
      ) : null}
    </div>
  );
}
