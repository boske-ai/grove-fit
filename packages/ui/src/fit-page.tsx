import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildHardwareFitSnapshot,
  type HardwareFitSnapshot,
} from '@boske-labs/grove-fit-core';
import {
  buildManualHardwareProfile,
  detectWebGpuHardwareProfile,
  hardwareProfileToSystemInfo,
  type HardwareProfile,
} from '@boske-labs/grove-fit-detect';
import { CloudFallbackBanner } from './cloud-fallback-banner.js';
import { FitToolbar } from './fit-toolbar.js';
import { HardwareForm, profileToFormValues, type HardwareFormValues } from './hardware-form.js';
import { HardwareSummary } from './hardware-summary.js';
import { ModelSearch } from './model-search.js';
import { Logo } from './logo.js';
import { TierResultGrid } from './tier-result-grid.js';
import type { CatalogModelEntry } from './types.js';
import './styles.css';

export type CatalogLoadStatus = 'loading-full' | 'ready' | 'boske-only';

export interface FitPageProps {
  catalogEntries: CatalogModelEntry[];
  initialProfile?: HardwareProfile | null;
  autoDetectWebGpu?: boolean;
  detectHardware?: () => Promise<HardwareProfile | null>;
  catalogStatus?: CatalogLoadStatus;
  onRefreshCatalog?: () => void;
  isRefreshingCatalog?: boolean;
}

const DEFAULT_FORM: HardwareFormValues = {
  totalRAMGB: 16,
  gpuMemoryGB: 0,
  gpuBackend: 'cpu',
};

function snapshotFromProfile(profile: HardwareProfile): HardwareFitSnapshot {
  return buildHardwareFitSnapshot(hardwareProfileToSystemInfo(profile));
}

export function FitPage({
  catalogEntries,
  initialProfile = null,
  autoDetectWebGpu = true,
  detectHardware,
  catalogStatus = 'ready',
  onRefreshCatalog,
  isRefreshingCatalog = false,
}: FitPageProps) {
  const boskeEntries = useMemo(
    () => catalogEntries.filter((e) => e.isBoske),
    [catalogEntries],
  );

  const [mode, setMode] = useState<'auto' | 'manual'>(initialProfile ? 'auto' : 'manual');
  const [profile, setProfile] = useState<HardwareProfile | null>(initialProfile);
  const [snapshot, setSnapshot] = useState<HardwareFitSnapshot | null>(
    initialProfile ? snapshotFromProfile(initialProfile) : null,
  );
  const [detectMessage, setDetectMessage] = useState('Tell us about your machine — nothing is uploaded.');
  const [form, setForm] = useState<HardwareFormValues>(
    initialProfile ? profileToFormValues(initialProfile) : DEFAULT_FORM,
  );
  const [isScanning, setIsScanning] = useState(!initialProfile);
  const manualProfileLockedRef = useRef(false);

  const applyProfile = useCallback((next: HardwareProfile, message: string) => {
    setProfile(next);
    setSnapshot(snapshotFromProfile(next));
    setDetectMessage(message);
    setForm(profileToFormValues(next));
    setMode('auto');
  }, []);

  const runDetect = useCallback(async (options?: { force?: boolean }) => {
    const force = options?.force ?? false;
    if (force) {
      manualProfileLockedRef.current = false;
    }

    setIsScanning(true);
    try {
      if (detectHardware) {
        const desktop = await detectHardware();
        if (desktop) {
          if (!manualProfileLockedRef.current || force) {
            const sourceLabel =
              desktop.source === 'llmfit'
                ? 'Detected via llmfit — adjust if this looks wrong.'
                : 'Detected on this machine — adjust if this looks wrong.';
            applyProfile(desktop, sourceLabel);
          }
          return;
        }
      }

      if (autoDetectWebGpu) {
        const result = await detectWebGpuHardwareProfile();
        if (result.profile) {
          if (!manualProfileLockedRef.current || force) {
            applyProfile(result.profile, 'Detected via WebGPU — adjust if this looks wrong.');
          }
          return;
        }
      }

      if (!manualProfileLockedRef.current || force) {
        setDetectMessage('Auto-detect unavailable — enter your hardware manually.');
        setMode('manual');
      }
    } finally {
      setIsScanning(false);
    }
  }, [applyProfile, autoDetectWebGpu, detectHardware]);

  useEffect(() => {
    if (initialProfile) return;
    void runDetect();
  }, [initialProfile]); // mount + when initialProfile prop changes

  function handleManualSubmit() {
    manualProfileLockedRef.current = true;
    const manual = buildManualHardwareProfile({
      totalRAMGB: form.totalRAMGB,
      gpuMemoryGB: form.gpuMemoryGB,
      gpuBackend: form.gpuBackend,
      platform: 'web',
    });
    applyProfile(manual, 'Manual hardware profile — nothing is uploaded.');
  }

  function handleEditHardware() {
    if (profile) {
      setForm(profileToFormValues(profile));
    }
    setMode('manual');
  }

  return (
    <div className="gf-root">
      <div className="gf-shell">
        <header className="gf-topbar">
          <div className="gf-brand">
            <Logo size={30} className="gf-brand-logo" />
            <h1>Grove Fit</h1>
          </div>
          <FitToolbar
            onRescan={() => void runDetect({ force: true })}
            onRefreshCatalog={onRefreshCatalog}
            isScanning={isScanning}
            isRefreshingCatalog={isRefreshingCatalog}
            catalogCount={catalogEntries.length}
            catalogStatus={catalogStatus}
          />
        </header>

        {catalogStatus === 'loading-full' ? (
          <div className="gf-loading-banner">Loading catalog…</div>
        ) : null}

        {mode === 'manual' || !profile ? (
          <HardwareForm
            values={form}
            onChange={setForm}
            onSubmit={handleManualSubmit}
            onCancel={profile ? () => setMode('auto') : undefined}
            disabled={isScanning}
          />
        ) : (
          <HardwareSummary
            profile={profile}
            isScanning={isScanning}
            onEdit={handleEditHardware}
          />
        )}

        {snapshot && !isScanning ? (
          <div className="gf-main-grid">
            <ModelSearch entries={catalogEntries} snapshot={snapshot} />
            <TierResultGrid snapshot={snapshot} boskeTiers={boskeEntries} />
          </div>
        ) : null}

        {snapshot ? <CloudFallbackBanner snapshot={snapshot} /> : null}

        {isScanning ? (
          <div className="gf-loading-banner">Scanning hardware…</div>
        ) : null}

        <footer className="gf-footer">
          Model data from llmfit (MIT). Updated monthly. Powered by Boske Labs Grove Fit.
        </footer>
      </div>
    </div>
  );
}
