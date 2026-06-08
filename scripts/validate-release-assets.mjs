#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const dir = process.env.RELEASE_ASSET_DIR || process.argv[2] || 'packaged-assets';
const version = process.env.RELEASE_VERSION || process.env.VERSION || '';

if (!version) {
  console.error('RELEASE_VERSION is required for release asset validation.');
  process.exit(1);
}
if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
  console.error(`Release asset directory '${dir}' does not exist.`);
  process.exit(1);
}

const platforms = [
  'Windows-x86_64',
  'macOS-Apple-Silicon',
  'macOS-Intel',
  'Linux-x86_64'
];

const expected = platforms.flatMap((platform) => [
  `MCDF-Manager-${platform}-v${version}.zip`,
  `MCDF-Manager-${platform}-latest.zip`
]);

const actual = new Set(fs.readdirSync(dir));
const missing = expected.filter((name) => !actual.has(name));
const unexpected = [...actual]
  .filter((name) => name.endsWith('.zip'))
  .filter((name) => !expected.includes(name))
  .sort();

if (missing.length > 0 || unexpected.length > 0) {
  if (missing.length > 0) {
    console.error('Missing required release assets:');
    for (const name of missing) console.error(`- ${name}`);
  }
  if (unexpected.length > 0) {
    console.error('Unexpected zip release assets:');
    for (const name of unexpected) console.error(`- ${name}`);
  }
  process.exit(1);
}

for (const name of expected) {
  const file = path.join(dir, name);
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size <= 0) {
    console.error(`Release asset '${name}' is empty or not a file.`);
    process.exit(1);
  }
}

console.log('Release assets use the required stable names:');
for (const name of expected) console.log(`- ${name}`);
