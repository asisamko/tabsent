// Builds focus-bypass.bookmarklet.txt from focus-bypass.user.js.
// Usage: node bypass/build-bookmarklet.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(dir, 'focus-bypass.user.js'), 'utf8');
const body = src
  .slice(src.indexOf('(() => {'))
  .split('\n')
  .map((l) => l.replace(/^\s*\/\/.*$/, '').replace(/\/\*[^*]*\*\//g, '').trim())
  .filter(Boolean)
  .join(' ');
fs.writeFileSync(path.join(dir, 'focus-bypass.bookmarklet.txt'), `javascript:${encodeURIComponent(body)}void 0\n`);
console.log('bookmarklet:', body.length, 'chars');
