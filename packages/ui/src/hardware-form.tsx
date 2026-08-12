import { useEffect, useState } from 'react';
import type { GpuBackend } from '@boske-labs/grove-fit-detect';
import type { HardwareProfile } from '@boske-labs/grove-fit-detect';

export interface HardwareFormValues {
  totalRAMGB: number;
  gpuMemoryGB: number;
  gpuBackend: GpuBackend;
}

export const RAM_MIN = 4;
export const RAM_MAX = 256;
export const VRAM_MIN = 0;
export const VRAM_MAX = 128;

const BACKENDS: GpuBackend[] = ['cpu', 'metal', 'cuda', 'vulkan', 'webgpu', 'unknown'];

function isGpuBackend(value: string): value is GpuBackend {
  return (BACKENDS as string[]).includes(value);
}

/** Parse RAM input; empty/NaN/out-of-range → null (no silent default). */
export function parseRamInput(raw: string, min = RAM_MIN, max = RAM_MAX): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

/** Parse VRAM input; empty/NaN/out-of-range → null (0 is valid when typed). */
export function parseVramInput(raw: string, min = VRAM_MIN, max = VRAM_MAX): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

/** Human-readable reason a field is not usable yet, or null when it is valid. */
export function ramInputError(raw: string): string | null {
  if (raw.trim() === '') return 'Enter your system RAM.';
  if (parseRamInput(raw) === null) {
    return `Enter a number between ${RAM_MIN} and ${RAM_MAX} GB.`;
  }
  return null;
}

export function vramInputError(raw: string, ramRaw?: string): string | null {
  if (raw.trim() === '') return 'Enter your VRAM, or 0 if you have no GPU.';
  const vram = parseVramInput(raw);
  if (vram === null) {
    return `Enter a number between ${VRAM_MIN} and ${VRAM_MAX} GB.`;
  }
  // Discrete VRAM above total RAM is not a real machine, and the tier maths
  // silently clamps it, so the user would get a verdict for hardware they did
  // not describe. Unified-memory backends legitimately share one pool, so this
  // only guards the case where the two numbers are independent.
  if (ramRaw !== undefined) {
    const ram = parseRamInput(ramRaw);
    if (ram !== null && vram > ram) {
      return `VRAM (${vram} GB) cannot exceed system RAM (${ram} GB).`;
    }
  }
  return null;
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
  /**
   * Receives the fully validated values. Passing them explicitly avoids reading
   * a parent's not-yet-committed state on the same tick.
   */
  onSubmit: (values: HardwareFormValues) => void;
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
  // Raw strings are the source of truth while editing, so a partially typed or
  // out-of-range value is never silently dropped and replaced by stale state.
  const [ramText, setRamText] = useState(String(values.totalRAMGB));
  const [vramText, setVramText] = useState(String(values.gpuMemoryGB));
  const [showErrors, setShowErrors] = useState(false);

  // Re-sync when the parent swaps in a different profile (auto-detect, rescan).
  useEffect(() => {
    setRamText(String(values.totalRAMGB));
    setVramText(String(values.gpuMemoryGB));
    setShowErrors(false);
  }, [values.totalRAMGB, values.gpuMemoryGB]);

  const unifiedMemory = values.gpuBackend === 'metal';
  const ramError = ramInputError(ramText);
  const vramError = vramInputError(vramText, unifiedMemory ? undefined : ramText);
  const hasErrors = ramError !== null || vramError !== null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (hasErrors) {
      setShowErrors(true);
      return;
    }
    // Non-null: hasErrors is false, so both parsed cleanly.
    const next: HardwareFormValues = {
      ...values,
      totalRAMGB: parseRamInput(ramText)!,
      gpuMemoryGB: parseVramInput(vramText)!,
    };
    onChange(next);
    onSubmit(next);
  }

  const ramInvalid = showErrors && ramError !== null;
  const vramInvalid = showErrors && vramError !== null;

  return (
    <form className="gf-card" onSubmit={handleSubmit} noValidate>
      <h2>Your hardware</h2>
      <p className="gf-hint">Nothing is uploaded — all fit math runs locally.</p>

      <label className="gf-label" htmlFor="gf-ram">
        System RAM (GB)
      </label>
      <input
        id="gf-ram"
        className={`gf-input${ramInvalid ? ' gf-input-invalid' : ''}`}
        type="number"
        inputMode="numeric"
        min={RAM_MIN}
        max={RAM_MAX}
        value={ramText}
        disabled={disabled}
        aria-invalid={ramInvalid || undefined}
        aria-describedby={ramInvalid ? 'gf-ram-error' : undefined}
        onChange={(e) => setRamText(e.target.value)}
      />
      {ramInvalid ? (
        <p className="gf-field-error" id="gf-ram-error" role="alert">
          {ramError}
        </p>
      ) : null}

      <label className="gf-label" htmlFor="gf-vram">
        GPU VRAM (GB, 0 if none)
      </label>
      <input
        id="gf-vram"
        className={`gf-input${vramInvalid ? ' gf-input-invalid' : ''}`}
        type="number"
        inputMode="numeric"
        min={VRAM_MIN}
        max={VRAM_MAX}
        value={vramText}
        disabled={disabled}
        aria-invalid={vramInvalid || undefined}
        aria-describedby={vramInvalid ? 'gf-vram-error' : undefined}
        onChange={(e) => setVramText(e.target.value)}
      />
      {vramInvalid ? (
        <p className="gf-field-error" id="gf-vram-error" role="alert">
          {vramError}
        </p>
      ) : null}

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
          if (!isGpuBackend(backend)) return;
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
