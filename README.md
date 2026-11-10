# TabSent

Stop websites from noticing that you switched to another window, tab or app.
The page always thinks it is visible and focused.

TabSent was previously called **Window Focus Bypass**; the script files keep their old names so
existing userscript installs keep updating.

**Quickest start:** open [`index.html`](index.html) (double-click the file) and follow the steps there.

**Hosted version:** <https://tabsent.oryks.org> — the same install page plus the
[live demo](https://tabsent.oryks.org/demo).

**See it work:** open [`demo.html`](demo.html) — a page that watches whether the window is focused.
Switch away and it notices; click **Activate TabSent** and it stops noticing.

## Usage

### 1. Bookmarklet – easiest

1. Open `index.html` in Chrome.
2. Show the bookmarks bar: <kbd>⌘</kbd><kbd>⇧</kbd><kbd>B</kbd> (Mac) / <kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>B</kbd> (Windows).
3. Drag the **🙈 Drag to bookmarks bar** button onto the bookmarks bar.
4. On the page where you want it, click the bookmark. It stays active until you reload the page.

You can also create the bookmark by hand: add a new bookmark and paste the whole content of
`focus-bypass.bookmarklet.txt` into its URL field.

### 2. Userscript – most reliable

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Open [focus-bypass.user.js (raw)](https://raw.githubusercontent.com/asisamko/tabsent/main/focus-bypass.user.js)
   and confirm **Install**.

The script then runs automatically on every page, before the page's own scripts, and updates itself.
To limit it to certain sites, edit the `@match` line in Tampermonkey
(e.g. `// @match https://www.example.com/*`), or switch it off there with one click.

### 3. Chrome extension – per-site switch

1. Download the extension ZIP from the
   [latest release](https://github.com/asisamko/tabsent/releases/latest/download/tabsent-extension.zip)
   and unzip it. (Or `git clone` the repo and use the `extension/` folder.)
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick the unzipped folder (the one that contains `manifest.json`).
4. Pin **TabSent** to the toolbar. On any site, click its icon and switch it on.

Chrome then asks for access to that one site only. The extension asks for no site access at install
time. Turning on **All sites** asks for access to every website. Once it is on, the extension
reloads the page automatically (save any unsaved work first) so the guard also runs before the
page's own scripts. Tabs where it is on show an orange **ON** badge. Remove sites from the list in
the popup.

### 4. Console – no install

1. On the page you want to protect, open the console:
   <kbd>⌥</kbd><kbd>⌘</kbd><kbd>J</kbd> (Mac) / <kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>J</kbd> (Windows).
2. Click **Copy script** on `index.html` (or copy the content of `focus-bypass.user.js`), paste it
   into the console and press <kbd>Enter</kbd>. Chrome may first ask you to type `allow pasting`.
3. It works right away, but lasts only until you reload the page. For automatic protection, use the
   userscript or the extension.

## Which one to pick

| | Bookmarklet | Userscript | Extension | Console |
|---|---|---|---|---|
| Install | none | Tampermonkey | load unpacked | none |
| How it starts | click on each page | automatically | automatically, on the sites you pick | paste on each page |
| Reliability | good | best | best (reloads the page once) | good |

The bookmarklet and the console run only after the page has loaded. They hide everything except
`blur` listeners the page had already added with `addEventListener` before that. If a page still
notices that you left, use the userscript.

## What it does

- `document.hidden` is always `false`, `document.visibilityState` is always `"visible"`,
  `document.hasFocus()` always returns `true`.
- The page gets no `blur` or `visibilitychange` events when you leave the window or tab;
  `onblur` and `onvisibilitychange` handlers don't fire either.
- It gets no `mouseleave` / `mouseout` when the mouse leaves the page.
- Moving focus between fields on the page itself still works normally.

## Editing

After changing `focus-bypass.user.js`, run `node build.mjs`. It regenerates
`focus-bypass.bookmarklet.txt`, `index.html`, `demo.html` and `extension/guard.js`, and copies `@version` into
`extension/manifest.json`. Then click the reload icon on the extension's card in `chrome://extensions`. When you publish a new version, also bump
`@version` so Tampermonkey picks up the update.

## Files

| File | What it is |
|---|---|
| `focus-bypass.user.js` | the script itself (userscript, also works pasted into the console) |
| `focus-bypass.bookmarklet.txt` | the same script as a bookmarklet |
| `index.html` | install page with the drag-to-bookmarks button and a copy button |
| `demo.html` | live demo: a page that watches focus, with a button to activate the bypass |
| `og-image.png` | 1200×630 social preview image (source: `og-image.svg`) |
| `extension/` | Chrome extension (Manifest V3) with a toolbar popup; `guard.js` in it is generated |
| `build.mjs` | builds the bookmarklet, `index.html`, `demo.html` and `extension/guard.js` from the script |
| `build-extension.mjs` | builds the release ZIP of the extension into `dist/` |
| `build-web.mjs` | builds the hosted site (install page, demo, userscript and OG image) into a separate folder |

> Hiding focus changes may be against the rules on online tests and exams.

Made by [oryks.org](https://oryks.org).
