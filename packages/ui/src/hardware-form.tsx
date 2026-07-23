import type { GpuBackend } from '@boske-labs/grove-fit-detect';
import type { HardwareProfile } from '@boske-labs/grove-fit-detect';

export interface HardwareFormValues {
  totalRAMGB: number;
  gpuMemoryGB: number;
  gpuBackend: GpuBackend;
}

/** Parse RAM input; empty/NaN/out-of-range → null (no silent default). */
export function parseRamInput(raw: string, min = 4, max = 256): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

/** Parse VRAM input; empty/NaN/out-of-range → null (0 is valid when typed). */
export function parseVramInput(raw: string, min = 0, max = 128): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

export function profileToFormValues(profile: HardwareProfile): HardwareFormValues {
  return {
    totalRAMGB: profile.totalRAMGB,
    gpuMemoryGB: profile.gpuMemoryGB ?? 0,
    gpuBackend: profile.gpuBackend,
  };
}

interface HardwareFormProps {
  values: HardwareFormValues;
  onChange: (values: HardwareFormValues) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export function HardwareForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  disabled = false,
}: HardwareFormProps) {
  return (
    <form
      className="gf-card"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <h2>Your hardware</h2>
      <p className="gf-hint">Nothing is uploaded — all fit math runs locally.</p>
      <label className="gf-label" htmlFor="gf-ram">
        System RAM (GB)
      </label>
      <input
        id="gf-ram"
        className="gf-input"
        type="number"
        min={4}
        max={256}
        value={values.totalRAMGB}
        disabled={disabled}
        onChange={(e) => {
          const next = parseRamInput(e.target.value);
          if (next === null) return;
          onChange({ ...values, totalRAMGB: next });
        }}
      />
      <label className="gf-label" htmlFor="gf-vram">
        GPU VRAM (GB, 0 if none)
      </label>
      <input
        id="gf-vram"
        className="gf-input"
        type="number"
        min={0}
        max={128}
        value={values.gpuMemoryGB}
        disabled={disabled}
        onChange={(e) => {
          const next = parseVramInput(e.target.value);
          if (next === null) return;
          onChange({ ...values, gpuMemoryGB: next });
        }}
      />
      <label className="gf-label" htmlFor="gf-backend">
        Backend
      </label>
      <select
        id="gf-backend"
        className="gf-select"
        value={values.gpuBackend}
        disabled={disabled}
        onChange={(e) => {
          const backend = e.target.value;
          if (
            backend !== 'cpu' &&
            backend !== 'metal' &&
            backend !== 'cuda' &&
            backend !== 'vulkan' &&
            backend !== 'webgpu' &&
            backend !== 'unknown'
          ) {
            return;
          }
          onChange({ ...values, gpuBackend: backend });
        }}
      >
        <option value="cpu">CPU only</option>
        <option value="metal">Metal (Apple)</option>
        <option value="cuda">CUDA / NVIDIA</option>
        <option value="vulkan">Vulkan</option>
        <option value="webgpu">WebGPU</option>
        <option value="unknown">Unknown GPU</option>
      </select>
      <div className="gf-row">
        <button type="submit" className="gf-btn" disabled={disabled}>
          Calculate fit
        </button>
        {onCancel ? (
          <button type="button" className="gf-btn ghost" onClick={onCancel} disabled={disabled}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
