#!/usr/bin/env node
/** Cross-platform Grove Fit GUI launcher (built web assets + Tauri). */
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { stageCatalog } from './stage-catalog.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESKTOP = join(root, 'apps/desktop');
const SRC_TAURI = join(DESKTOP, 'src-tauri');

function stageCatalogIntoDist() {
  const publicDir = join(root, 'apps/web/public');
  const distDir = join(root, 'apps/web/dist');
  mkdirSync(distDir, { recursive: true });
  for (const name of ['catalog.json', 'search-index.json']) {
    const src = join(publicDir, name);
    if (existsSync(src)) {
      copyFileSync(src, join(distDir, name));
    }
  }
}

if (!stageCatalog(root)) {
  console.log('Catalog missing — running sync…');
  const sync = spawn('bun', ['run', 'sync:catalog'], { cwd: root, stdio: 'inherit' });
  const code = await new Promise((resolve) => sync.on('exit', resolve));
  if (code !== 0) {
    process.exit(code ?? 1);
  }
  stageCatalog(root);
}

console.log('');
console.log('  Grove Fit GUI');
console.log('  ─────────────────────────────────────');
console.log('  Mode:   tauri:// asset protocol');
console.log('  Native: Tauri window');
console.log('');

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
}

function hostTriple() {
  const result = spawnSync('rustc', ['--print', 'host-tuple'], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error('rustc --print host-tuple failed');
  }
  return result.stdout.trim();
}

/** Resolve staged sidecar (triple-named) and the stripped name Tauri expects at runtime. */
function resolveSidecarPaths() {
  const triple = hostTriple();
  const ext = triple.includes('windows') ? '.exe' : '';
  const named = join(SRC_TAURI, 'binaries', `llmfit-${triple}${ext}`);
  const strippedDebug = join(SRC_TAURI, 'target/debug', `llmfit${ext}`);
  const src = existsSync(named) ? named : existsSync(strippedDebug) ? strippedDebug : null;
  return { src, destName: `llmfit${ext}` };
}

/** macOS Tahoe: WKWebView paints when launched as a real .app, not a raw binary. */
function stageMacDevApp(binaryPath) {
  const appDir = join(SRC_TAURI, 'target/debug/Grove Fit.app');
  rmSync(appDir, { recursive: true, force: true });
  mkdirSync(join(appDir, 'Contents/MacOS'), { recursive: true });
  writeFileSync(
    join(appDir, 'Contents/Info.plist'),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>grove-fit-desktop</string>
  <key>CFBundleIdentifier</key>
  <string>dev.boske.grove-fit</string>
  <key>CFBundleName</key>
  <string>Grove Fit</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>0.1.0</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
`,
  );
  writeFileSync(
    join(appDir, 'Contents/GroveFit.entitlements'),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.app-sandbox</key>
  <false/>
  <key>com.apple.security.network.client</key>
  <true/>
</dict>
</plist>
`,
  );
  const dest = join(appDir, 'Contents/MacOS/grove-fit-desktop');
  copyFileSync(binaryPath, dest);
  chmodSync(dest, 0o755);

  const { src: sidecarSrc, destName } = resolveSidecarPaths();
  if (sidecarSrc) {
    const sidecarDest = join(appDir, 'Contents/MacOS', destName);
    copyFileSync(sidecarSrc, sidecarDest);
    chmodSync(sidecarDest, 0o755);
    console.log(`  Sidecar: ${sidecarDest}`);
  } else {
    console.warn('  Warning: llmfit sidecar not found — hardware detect falls back to native probes');
  }

  return appDir;
}

console.log('  Staging llmfit sidecar…');
await run('bash', [join(root, 'scripts/copy-llmfit-sidecar.sh')], { cwd: root });

console.log('  Building web dist…');
await run('bun', ['x', 'vite', 'build'], { cwd: join(root, 'apps/web') });
stageCatalog(root);
stageCatalogIntoDist();

console.log('  Building desktop binary…');
await run('cargo', ['build', '--no-default-features'], { cwd: SRC_TAURI });

let desktopChild;
if (process.platform === 'darwin') {
  const binary = join(SRC_TAURI, 'target/debug/grove-fit-desktop');
  const appDir = stageMacDevApp(binary);
  const entitlements = join(appDir, 'Contents/GroveFit.entitlements');
  await run('codesign', [
    '--force',
    '--deep',
    '--sign',
    '-',
    '--entitlements',
    entitlements,
    appDir,
  ]);
  console.log(`  Opening ${appDir}`);
  desktopChild = spawn('open', ['-W', appDir], { stdio: 'inherit' });
} else {
  desktopChild = spawn(
    join(SRC_TAURI, 'target/debug/grove-fit-desktop'),
    [],
    { cwd: SRC_TAURI, stdio: 'inherit', shell: process.platform === 'win32' },
  );
}

const shutdown = () => {
  desktopChild.kill('SIGTERM');
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

desktopChild.on('exit', (code) => {
  process.exit(code ?? 0);
});
