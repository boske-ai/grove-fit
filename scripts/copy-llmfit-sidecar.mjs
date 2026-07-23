#!/usr/bin/env node
/** Cross-platform llmfit sidecar staging for Tauri externalBin (best-effort). */
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const binDir = join(root, 'apps/desktop/src-tauri/binaries');
const hashManifest = join(binDir, 'llmfit-sidecar-hashes.json');

mkdirSync(binDir, { recursive: true });

function hostTriple() {
  if (process.env.TARGET_TRIPLE) {
    return process.env.TARGET_TRIPLE;
  }
  const result = spawnSync('rustc', ['--print', 'host-tuple'], { encoding: 'utf8' });
  if (result.status !== 0) {
    console.log('copy-llmfit-sidecar: rustc not found — skip sidecar staging');
    process.exit(0);
  }
  return result.stdout.trim();
}

const targetTriple = hostTriple();
const ext = targetTriple.includes('windows') ? '.exe' : '';
const dest = join(binDir, `llmfit-${targetTriple}${ext}`);

function sha256File(file) {
  const data = readFileSync(file);
  return createHash('sha256').update(data).digest('hex');
}

function expectedHashForTriple(triple) {
  if (process.env.LLMFIT_SIDECAR_EXPECTED_SHA256) {
    return process.env.LLMFIT_SIDECAR_EXPECTED_SHA256.trim();
  }
  if (existsSync(hashManifest)) {
    const data = JSON.parse(readFileSync(hashManifest, 'utf8'));
    const pinned = String(data.hashes?.[triple] ?? '').trim();
    // Empty placeholders in the committed manifest are not pins.
    if (pinned) return pinned;
  }
  return '';
}

/** Returns pinned hash, or null when the triple has no pin (empty placeholder). */
function pinnedHashOrNull(triple) {
  const expected = expectedHashForTriple(triple);
  return expected || null;
}

/** Unpinned real sidecars are refused — stub so cargo/tauri builds still succeed. */
function refuseUnpinnedRealSidecar() {
  console.error(
    `copy-llmfit-sidecar: no pinned SHA256 for ${targetTriple} — refusing unverified real sidecar`,
  );
  console.error(
    '  add hashes.<triple> in llmfit-sidecar-hashes.json or set LLMFIT_SIDECAR_EXPECTED_SHA256',
  );
  writeStub();
  process.exit(0);
}

function verifySidecarHash(file, expected) {
  const actual = sha256File(file);
  if (actual !== expected) {
    console.error(`copy-llmfit-sidecar: SHA256 mismatch for ${targetTriple}`);
    console.error(`  expected: ${expected}`);
    console.error(`  actual:   ${actual}`);
    process.exit(1);
  }
  console.log(`copy-llmfit-sidecar: SHA256 verified (${actual})`);
}

function isStubSidecar(file) {
  if (!existsSync(file)) return false;
  const firstLine = readFileSync(file, 'utf8').split('\n')[0] ?? '';
  return firstLine.startsWith('#!/');
}

function resolveLlmfit() {
  const envPath = process.env.LLMFIT_PATH;
  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  const whichCmd = process.platform === 'win32' ? 'where' : 'which';
  const which = spawnSync(whichCmd, ['llmfit'], { encoding: 'utf8' });
  if (which.status === 0) {
    const candidate = which.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  for (const candidate of ['/opt/homebrew/bin/llmfit', '/usr/local/bin/llmfit']) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function sidecarUpToDate(src, destPath) {
  if (!existsSync(src) || !existsSync(destPath)) return false;
  if (isStubSidecar(destPath)) return false;
  return sha256File(src) === sha256File(destPath);
}

function writeStub() {
  writeFileSync(
    dest,
    `#!/usr/bin/env bash
# Placeholder — replace via copy-llmfit-sidecar when llmfit is installed.
exit 1
`,
    'utf8',
  );
  try {
    chmodSync(dest, 0o755);
  } catch {
    // Windows may ignore executable bits.
  }
  console.log(`copy-llmfit-sidecar: stub at ${dest} (install llmfit for rich GPU detect)`);
  console.log('  brew install AlexsJones/llmfit/llmfit');
  console.log('  or LLMFIT_PATH=/path/to/llmfit node scripts/copy-llmfit-sidecar.mjs');
}

if (existsSync(dest) && process.env.FORCE_LLMFIT_SIDECAR !== '1') {
  const src = resolveLlmfit();

  if (src) {
    if (sidecarUpToDate(src, dest)) {
      const pinned = pinnedHashOrNull(targetTriple);
      if (!pinned) {
        refuseUnpinnedRealSidecar();
      }
      console.log(`copy-llmfit-sidecar: up to date at ${dest}`);
      verifySidecarHash(dest, pinned);
      process.exit(0);
    }
  } else if (isStubSidecar(dest)) {
    console.log('copy-llmfit-sidecar: stub present, llmfit not installed — skip');
    process.exit(0);
  } else {
    const pinned = pinnedHashOrNull(targetTriple);
    if (!pinned) {
      refuseUnpinnedRealSidecar();
    }
    verifySidecarHash(dest, pinned);
    console.log(`copy-llmfit-sidecar: present at ${dest}`);
    process.exit(0);
  }
}

const src = resolveLlmfit();
if (src) {
  const pinned = pinnedHashOrNull(targetTriple);
  if (!pinned) {
    refuseUnpinnedRealSidecar();
  }
  copyFileSync(src, dest);
  try {
    chmodSync(dest, 0o755);
  } catch {
    // Windows may ignore executable bits.
  }
  const actualHash = sha256File(dest);
  writeFileSync(`${dest}.sha256`, `${actualHash}\n`, 'utf8');
  console.log(`copy-llmfit-sidecar: copied ${src} → ${dest}`);
  console.log(`copy-llmfit-sidecar: sha256 ${actualHash}`);
  verifySidecarHash(dest, pinned);
} else {
  writeStub();
}
