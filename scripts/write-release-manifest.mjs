#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

function positionalArgs(argv) {
  return argv.slice(2).filter((arg) => arg !== '--');
}

const args = positionalArgs(process.argv);
const dir = args[0] || process.env.RELEASE_ASSET_DIR || 'packaged-assets';
const version = process.env.RELEASE_VERSION || process.env.VERSION || '0.0.0';
const tag = process.env.TAG_NAME || `client-v${version}`;

if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
  console.error(`Release asset directory '${dir}' does not exist.`);
  console.error('Usage: node scripts/write-release-manifest.mjs [packaged-assets]');
  process.exit(1);
}

const assets = fs.readdirSync(dir)
  .filter((name) => name.endsWith('.zip'))
  .sort()
  .map((name) => {
    const file = path.join(dir, name);
    return {
      name,
      size_bytes: fs.statSync(file).size,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    };
  });

if (assets.length === 0) {
  console.error(`No .zip release assets found in '${dir}'.`);
  process.exit(1);
}

const manifest = {
  product: 'MCDF Manager',
  version,
  tag,
  commit: process.env.GITHUB_SHA || null,
  built_at: new Date().toISOString(),
  assets
};
fs.writeFileSync(path.join(dir, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Wrote ${path.join(dir, 'release-manifest.json')}.`);
