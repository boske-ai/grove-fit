#!/usr/bin/env node
const { readFileSync, mkdirSync, writeFileSync } = require('node:fs');
const { dirname, join } = require('node:path');
const sharp = require('/tmp/icon-gen/node_modules/sharp');

const root = join(__dirname, '..');
const svgPath = join(root, 'packages/ui/src/assets/logo.svg');
const svg = readFileSync(svgPath);

const outputs = [
  { path: 'apps/web/public/logo.svg', kind: 'copy' },
  { path: 'apps/web/public/favicon.svg', kind: 'copy' },
  { path: 'apps/web/public/apple-touch-icon.png', size: 180 },
  { path: 'apps/web/public/favicon-32x32.png', size: 32 },
  { path: 'apps/web/public/favicon-16x16.png', size: 16 },
  { path: 'apps/desktop/src-tauri/icons/icon.png', size: 512 },
  { path: 'apps/desktop/src-tauri/icons/32x32.png', size: 32 },
  { path: 'apps/desktop/src-tauri/icons/64x64.png', size: 64 },
  { path: 'apps/desktop/src-tauri/icons/128x128.png', size: 128 },
  { path: 'apps/desktop/src-tauri/icons/128x128@2x.png', size: 256 },
  { path: 'apps/desktop/src-tauri/icons/Square30x30Logo.png', size: 30 },
  { path: 'apps/desktop/src-tauri/icons/Square44x44Logo.png', size: 44 },
  { path: 'apps/desktop/src-tauri/icons/Square71x71Logo.png', size: 71 },
  { path: 'apps/desktop/src-tauri/icons/Square89x89Logo.png', size: 89 },
  { path: 'apps/desktop/src-tauri/icons/Square107x107Logo.png', size: 107 },
  { path: 'apps/desktop/src-tauri/icons/Square142x142Logo.png', size: 142 },
  { path: 'apps/desktop/src-tauri/icons/Square150x150Logo.png', size: 150 },
  { path: 'apps/desktop/src-tauri/icons/Square284x284Logo.png', size: 284 },
  { path: 'apps/desktop/src-tauri/icons/Square310x310Logo.png', size: 310 },
  { path: 'apps/desktop/src-tauri/icons/StoreLogo.png', size: 50 },
];

async function main() {
  for (const out of outputs) {
    const dest = join(root, out.path);
    mkdirSync(dirname(dest), { recursive: true });
    if (out.kind === 'copy') {
      writeFileSync(dest, svg);
      continue;
    }
    const png = await sharp(svg).resize(out.size, out.size).png().toBuffer();
    writeFileSync(dest, png);
    console.log(`wrote ${out.path} (${out.size}px)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
