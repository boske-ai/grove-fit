import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { assertValidHardwareProfile, inferPlatform } from '@boske-labs/grove-fit-detect';
import type { HardwareProfile } from '@boske-labs/grove-fit-detect';

const execFileAsync = promisify(execFile);

function roundGb(bytes: number): number {
  return Math.round((bytes / 1024 ** 3) * 10) / 10;
}

async function detectMacosNative(): Promise<HardwareProfile> {
  const { stdout } = await execFileAsync('sysctl', ['-n', 'hw.memsize'], { timeout: 5000 });
  const totalBytes = Number.parseInt(stdout.trim(), 10);
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) {
    throw new Error('sysctl hw.memsize returned invalid value');
  }
  const totalRAMGB = roundGb(totalBytes);

  let gpuName: string | undefined;
  try {
    const { stdout: displayJson } = await execFileAsync(
      'system_profiler',
      ['SPDisplaysDataType', '-json'],
      { timeout: 15000, maxBuffer: 4 * 1024 * 1024 },
    );
    const parsed = JSON.parse(displayJson) as {
      SPDisplaysDataType?: Array<{ _name?: string; sppci_model?: string }>;
    };
    const first = parsed.SPDisplaysDataType?.[0];
    gpuName = first?._name ?? first?.sppci_model;
  } catch {
    gpuName = undefined;
  }

  return assertValidHardwareProfile({
    platform: 'macos',
    totalRAMGB,
    gpuMemoryGB: totalRAMGB,
    gpuBackend: 'metal',
    gpuName,
    source: 'native',
  });
}

async function detectLinuxNative(): Promise<HardwareProfile> {
  const meminfo = readFileSync('/proc/meminfo', 'utf8');
  const totalKb = meminfo
    .split('\n')
    .find((line) => line.startsWith('MemTotal:'))
    ?.split(/\s+/)[1];
  const kb = totalKb ? Number.parseInt(totalKb, 10) : NaN;
  if (!Number.isFinite(kb) || kb <= 0) {
    throw new Error('MemTotal not found in /proc/meminfo');
  }

  return assertValidHardwareProfile({
    platform: 'linux',
    totalRAMGB: roundGb(kb * 1024),
    gpuMemoryGB: 0,
    gpuBackend: 'unknown',
    source: 'native',
  });
}

async function readWindowsRamBytes(): Promise<number> {
  try {
    const { stdout } = await execFileAsync(
      'powershell',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        '(Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory',
      ],
      { timeout: 15000, maxBuffer: 1024 * 1024 },
    );
    const bytes = Number.parseInt(stdout.trim(), 10);
    if (Number.isFinite(bytes) && bytes > 0) {
      return bytes;
    }
  } catch {
    // fall through to wmic
  }

  const { stdout } = await execFileAsync(
    'wmic',
    ['computersystem', 'get', 'totalphysicalmemory'],
    { timeout: 15000, maxBuffer: 1024 * 1024 },
  );
  const bytes = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => Number.parseInt(line, 10))
    .find((value) => Number.isFinite(value) && value > 0);

  if (bytes === undefined) {
    throw new Error('could not parse Windows total physical memory');
  }
  return bytes;
}

async function detectWindowsNative(): Promise<HardwareProfile> {
  const bytes = await readWindowsRamBytes();

  return assertValidHardwareProfile({
    platform: 'windows',
    totalRAMGB: roundGb(bytes),
    gpuMemoryGB: 0,
    gpuBackend: 'unknown',
    source: 'native',
  });
}

export async function detectNativeProfile(): Promise<HardwareProfile> {
  const platform = inferPlatform(process.platform);
  switch (platform) {
    case 'macos':
      return detectMacosNative();
    case 'linux':
      return detectLinuxNative();
    case 'windows':
      return detectWindowsNative();
    default:
      throw new Error(`Native hardware detection is not supported on ${process.platform}`);
  }
}
