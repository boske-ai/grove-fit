import { describe, expect, it } from 'vitest';
import { coerceHardwareProfile } from './normalize.js';
import { buildHardwareFitSnapshot } from '@boske-labs/grove-fit-core';
import { parseLlmfitSystemJson } from './adapters/llmfit.js';
import { buildManualHardwareProfile } from './adapters/manual.js';
import {
  detectAndroidProfile,
  detectIosProfile,
  parseNativeDetectRaw,
} from './adapters/native.js';
import { hardwareProfileToSystemInfo } from './to-system-info.js';
import {
  DEVICE_MEMORY_CLAMP_CEILING_GB,
  webGpuMemoryConfidence,
} from './adapters/webgpu.js';

describe('coerceHardwareProfile', () => {
  it('normalizes darwin platform and cuda backend from Tauri IPC shape', () => {
    const profile = coerceHardwareProfile({
      platform: 'darwin',
      totalRAMGB: 32,
      gpuMemoryGB: 24,
      gpuBackend: 'CUDA',
      gpuName: 'NVIDIA GeForce RTX 4090',
      source: 'llmfit',
    });
    expect(profile.platform).toBe('macos');
    expect(profile.gpuBackend).toBe('cuda');
    expect(profile.source).toBe('llmfit');
  });

  it('normalizes native macOS fallback profile', () => {
    const profile = coerceHardwareProfile({
      platform: 'macos',
      totalRAMGB: 36,
      gpuMemoryGB: 36,
      gpuBackend: 'metal',
      gpuName: 'Apple M3 Max',
      source: 'native',
    });
    expect(profile.platform).toBe('macos');
    expect(profile.gpuBackend).toBe('metal');
    expect(profile.totalRAMGB).toBe(36);
  });
});

describe('parseLlmfitSystemJson', () => {
  it('parses flat llmfit system payload', () => {
    const profile = parseLlmfitSystemJson(
      JSON.stringify({
        total_ram_gb: 32,
        gpu_vram_gb: 32,
        backend: 'metal',
        gpu: { name: 'Apple M2 Max' },
        os: 'macos',
      }),
    );
    expect(profile.totalRAMGB).toBe(32);
    expect(profile.gpuBackend).toBe('metal');
    expect(profile.source).toBe('llmfit');
  });
});

describe('hardwareProfileToSystemInfo', () => {
  it('maps 8GB CPU profile to seed recommended snapshot', () => {
    const profile = buildManualHardwareProfile({
      totalRAMGB: 8,
      gpuMemoryGB: 0,
      gpuBackend: 'cpu',
    });
    const snapshot = buildHardwareFitSnapshot(hardwareProfileToSystemInfo(profile));
    expect(snapshot.recommendedTier).toBe('seed');
    expect(snapshot.tierFit.forest).toBe('unavailable');
  });

  it('maps 32GB metal profile to forest recommended snapshot', () => {
    const profile = parseLlmfitSystemJson(
      JSON.stringify({ total_ram_gb: 32, gpu_vram_gb: 32, backend: 'metal', os: 'macos' }),
    );
    const snapshot = buildHardwareFitSnapshot(hardwareProfileToSystemInfo(profile));
    expect(snapshot.recommendedTier).toBe('forest');
  });

  it('preserves webgpu backend (no remap to cuda)', () => {
    const profile = buildManualHardwareProfile({
      totalRAMGB: 16,
      gpuMemoryGB: 10,
      gpuBackend: 'webgpu',
      platform: 'web',
    });
    const info = hardwareProfileToSystemInfo(profile);
    expect(info.gpuBackend).toBe('webgpu');
  });

  it('preserves unknown backend (no remap to cpu)', () => {
    const profile = coerceHardwareProfile({
      platform: 'linux',
      totalRAMGB: 32,
      gpuMemoryGB: 16,
      gpuBackend: 'unknown',
      source: 'native',
    });
    const info = hardwareProfileToSystemInfo(profile);
    expect(info.gpuBackend).toBe('unknown');
  });
});

describe('native adapters', () => {
  it('detects iOS unified memory', () => {
    const profile = detectIosProfile(6 * 1024 ** 3);
    expect(profile.platform).toBe('ios');
    expect(profile.gpuBackend).toBe('metal');
    expect(profile.source).toBe('native');
  });

  it('detects Android profile', () => {
    const profile = detectAndroidProfile(8 * 1024 ** 3);
    expect(profile.platform).toBe('android');
    expect(profile.totalRAMGB).toBe(8);
  });

  it('parses Capacitor iOS raw payload to conformance fixture shape', () => {
    const profile = parseNativeDetectRaw({
      platform: 'ios',
      totalMemoryBytes: 6 * 1024 ** 3,
    });
    expect(profile.platform).toBe('ios');
    expect(profile.totalRAMGB).toBe(6);
    expect(profile.gpuBackend).toBe('metal');
    expect(profile.gpuMemoryGB).toBe(0);
    expect(profile.source).toBe('native');
  });

  it('parses Capacitor Android raw payload to conformance fixture shape', () => {
    const profile = parseNativeDetectRaw({
      platform: 'android',
      totalMemoryBytes: 8 * 1024 ** 3,
      availableMemoryBytes: 4 * 1024 ** 3,
    });
    expect(profile.platform).toBe('android');
    expect(profile.totalRAMGB).toBe(8);
    expect(profile.gpuBackend).toBe('vulkan');
    expect(profile.gpuMemoryGB).toBe(2);
    expect(profile.availableRAMGB).toBe(4);
  });

  it('applies Android unified heuristic at 16GB (RAM−6, not half-RAM)', () => {
    const profile = parseNativeDetectRaw({
      platform: 'android',
      totalMemoryBytes: 16 * 1024 ** 3,
    });
    expect(profile.gpuBackend).toBe('vulkan');
    expect(profile.gpuMemoryGB).toBe(10);
  });
});

describe('webGpuMemoryConfidence (GF13)', () => {
  it('treats readings at or above the clamp ceiling as a lower bound', () => {
    // Chrome caps deviceMemory at 8; a 24 GB machine cannot be distinguished
    // from an 8 GB one, so the tier must not be assigned from this alone.
    expect(webGpuMemoryConfidence(8)).toBe('lower-bound');
    expect(webGpuMemoryConfidence(16)).toBe('lower-bound');
    expect(webGpuMemoryConfidence(64)).toBe('lower-bound');
  });

  it('treats readings below the ceiling as exact', () => {
    expect(webGpuMemoryConfidence(4)).toBe('exact');
    expect(webGpuMemoryConfidence(2)).toBe('exact');
  });

  it('exposes the ceiling it reasons about', () => {
    expect(DEVICE_MEMORY_CLAMP_CEILING_GB).toBe(8);
  });
});
