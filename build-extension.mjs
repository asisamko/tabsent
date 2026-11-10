// Builds the Chrome extension ZIP that is attached to a GitHub release.
//   node build-extension.mjs
// Output: dist/tabsent-extension.zip with manifest.json at the ZIP root.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const extension = path.join(dir, 'extension');
const outDir = path.join(dir, 'dist');
const out = path.join(outDir, 'tabsent-extension.zip');

// Keep guard.js and the manifest version in sync with focus-bypass.user.js.
execFileSync(process.execPath, [path.join(dir, 'build.mjs')], { stdio: 'inherit' });

fs.rmSync(out, { force: true });
fs.mkdirSync(outDir, { recursive: true });
execFileSync('zip', ['-r', '-X', out, '.', '-x', '*.DS_Store', '-x', '__MACOSX/*'], {
  cwd: extension,
  stdio: 'inherit',
});

const { size } = fs.statSync(out);
console.log(`extension zip: ${path.relative(dir, out)} (${(size / 1024).toFixed(1)} kB)`);
