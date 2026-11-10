# Window Focus Bypass

Stop websites from noticing that you switched to another window, tab or app.
The page always thinks it is visible and focused.

**Quickest start:** open [`index.html`](index.html) (double-click the file) and follow the steps there.

## Usage

### 1. Bookmarklet – easiest

1. Open `index.html` in Chrome.
2. Show the bookmarks bar: <kbd>⌘</kbd><kbd>⇧</kbd><kbd>B</kbd> (Mac) / <kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>B</kbd> (Windows).
3. Drag the **🙈 Focus Bypass** button onto the bookmarks bar.
4. On the page where you want it, click the bookmark. It stays active until you reload the page.

You can also create the bookmark by hand: add a new bookmark and paste the whole content of
`focus-bypass.bookmarklet.txt` into its URL field.

### 2. Userscript – most reliable

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Open [focus-bypass.user.js (raw)](https://raw.githubusercontent.com/asisamko/window-focus-bypass/main/focus-bypass.user.js)
   and confirm **Install**.

The script then runs automatically on every page, before the page's own scripts, and updates itself.
To limit it to certain sites, edit the `@match` line in Tampermonkey
(e.g. `// @match https://www.example.com/*`), or switch it off there with one click.

### 3. Console – no install

1. On the page, open the console: <kbd>⌥</kbd><kbd>⌘</kbd><kbd>J</kbd> (Mac) / <kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>J</kbd> (Windows).
2. Paste the content of `focus-bypass.user.js` (or copy it with the button in `index.html`) and press <kbd>Enter</kbd>.
   Chrome may first ask you to type `allow pasting`.

## Which one to pick

| | Bookmarklet | Userscript | Console |
|---|---|---|---|
| Install | none | Tampermonkey | none |
| How it starts | click on each page | automatically | paste on each page |
| Reliability | good | best | good |

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
`focus-bypass.bookmarklet.txt` and `index.html`. When you publish a new version, also bump
`@version` so Tampermonkey picks up the update.

## Files

| File | What it is |
|---|---|
| `focus-bypass.user.js` | the script itself (userscript, also works pasted into the console) |
| `focus-bypass.bookmarklet.txt` | the same script as a bookmarklet |
| `index.html` | install page with the drag-to-bookmarks button and a copy button |
| `build.mjs` | builds the bookmarklet and `index.html` from the script |

> Hiding focus changes may be against the rules on online tests and exams.
