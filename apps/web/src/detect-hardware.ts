import type { HardwareProfile } from '@boske-labs/grove-fit-detect';
import {
  coerceHardwareProfile,
  parseLlmfitSystemJson,
} from '@boske-labs/grove-fit-detect';

type DetectHardwareResult =
  | { kind: 'llmfit'; stdout: string }
  | { kind: 'native'; profile: Record<string, unknown> };

export function isTauriDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as Window & {
    __TAURI_INTERNALS__?: unknown;
    __TAURI__?: { core?: { invoke: unknown } };
  };
  return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI__?.core?.invoke);
}

export async function detectMobileHardware(): Promise<HardwareProfile | null> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    const { detectMobileHardware: detect } = await import(
      '@boske-labs/grove-fit-mobile/plugin'
    );
    return await detect();
  } catch (error) {
    console.warn('[Grove Fit] mobile detect failed:', error);
    return null;
  }
}

export async function detectDesktopHardware(): Promise<HardwareProfile | null> {
  if (!isTauriDesktop()) {
    return null;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<DetectHardwareResult>('detect_hardware');

    if (result.kind === 'llmfit') {
      return parseLlmfitSystemJson(result.stdout);
    }

    return coerceHardwareProfile(result.profile);
  } catch (error) {
    console.warn('[Grove Fit] desktop detect failed:', error);
    return null;
  }
}

/** Tauri desktop first, then Capacitor native (iOS/Android). */
export async function detectShellHardware(): Promise<HardwareProfile | null> {
  return (await detectDesktopHardware()) ?? (await detectMobileHardware());
}
