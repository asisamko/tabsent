// Builds the hosted site (install page + userscript + bookmarklet) into a separate folder,
// by default ../window-focus-bypass-web – a private repo that Vercel deploys.
//
//   node build-web.mjs                                   # userscript updates keep coming from GitHub
//   node build-web.mjs https://bypass.example.com        # userscript updates come from your domain
//   node build-web.mjs [https://…] --out <folder>        # write somewhere else
//
// It first runs build.mjs, so the site always matches focus-bypass.user.js.
// Only the generated files are overwritten; README.md, .git and anything else in the folder stay.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outArg = outIdx !== -1 ? args.splice(outIdx, 2)[1] : '../window-focus-bypass-web';
const out = outArg ? path.resolve(dir, outArg) : '';
const site = (args[0] ?? '').replace(/\/+$/, '');
if (!out || out === dir || (site && !/^https:\/\/[^/\s]+$/.test(site))) {
  console.error('Usage: node build-web.mjs [https://your-domain.com] [--out <folder>]');
  process.exit(1);
}

execFileSync(process.execPath, [path.join(dir, 'build.mjs')], { stdio: 'inherit' });
fs.mkdirSync(out, { recursive: true });

// Userscript: same file; with a domain, Tampermonkey checks that domain for updates.
let userscript = fs.readFileSync(path.join(dir, 'focus-bypass.user.js'), 'utf8');
if (site) {
  userscript = userscript.replace(
    /^(\/\/ @(?:downloadURL|updateURL)\s+).*$/gm,
    (_, key) => `${key}${site}/focus-bypass.user.js`
  );
}
fs.writeFileSync(path.join(out, 'focus-bypass.user.js'), userscript);
fs.copyFileSync(path.join(dir, 'focus-bypass.bookmarklet.txt'), path.join(out, 'focus-bypass.bookmarklet.txt'));

// Demo page: self-contained (the guard is inlined), just point its links back at the site root.
let demo = fs.readFileSync(path.join(dir, 'demo.html'), 'utf8');
demo = demo.replaceAll('href="index.html"', 'href="/"');
fs.writeFileSync(path.join(out, 'demo.html'), demo);

// Install page: install from this site instead of GitHub, plus favicon and share meta tags.
const description = 'Stop websites from noticing that you switched to another window, tab or app.';
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
html = html.replace(/href="https:\/\/raw\.githubusercontent\.com\/[^"]*focus-bypass\.user\.js"/g, 'href="/focus-bypass.user.js"');
const meta = [
  `<meta name="description" content="${description}">`,
  '<meta name="theme-color" content="#D97757">',
  '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
  '<meta property="og:title" content="Window Focus Bypass">',
  `<meta property="og:description" content="${description}">`,
  '<meta property="og:type" content="website">',
  ...(site ? [`<meta property="og:url" content="${site}/">`, `<link rel="canonical" href="${site}/">`] : []),
].join('\n');
html = html.replace('<title>Window Focus Bypass</title>', `<title>Window Focus Bypass</title>\n${meta}`);
fs.writeFileSync(path.join(out, 'index.html'), html);

fs.writeFileSync(
  path.join(out, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#D97757"/><g fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 32s7-12 20-12 20 12 20 12-7 12-20 12-20-12-20-12z"/><circle cx="32" cy="32" r="6"/><path d="M14 50L50 14"/></g></svg>\n`
);

const vercel = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  framework: null,
  cleanUrls: true,
  headers: [
    {
      source: '/focus-bypass.user.js',
      headers: [
        { key: 'Content-Type', value: 'text/javascript; charset=utf-8' },
        { key: 'Cache-Control', value: 'public, max-age=300, must-revalidate' },
      ],
    },
    {
      source: '/focus-bypass.bookmarklet.txt',
      headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }],
    },
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
};
fs.writeFileSync(path.join(out, 'vercel.json'), `${JSON.stringify(vercel, null, 2)}\n`);
fs.writeFileSync(path.join(out, '.vercelignore'), 'README.md\n.gitignore\n');
fs.writeFileSync(path.join(out, '.gitignore'), '.vercel/\n.DS_Store\n');

console.log(`site ready in ${out}${site ? ` for ${site}` : ''}`);
