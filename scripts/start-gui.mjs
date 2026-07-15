#!/usr/bin/env node
/** Cross-platform Grove Fit GUI launcher (Tauri + Vite). */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { stageCatalog } from './stage-catalog.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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
console.log('  Native window (Tauri) — recommended');
console.log('  Browser fallback:     bun run dev:web');
console.log('');

const child = spawn('bun', ['run', 'dev'], {
  cwd: join(root, 'apps/desktop'),
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code) => process.exit(code ?? 0));
