// ==UserScript==
// @name         Klaudík – skryť odchod z okna
// @namespace    klaudik
// @version      1.0.0
// @description  Stránka neuvidí, že si prepol na iné okno alebo kartu (blur / visibilitychange / hasFocus).
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @inject-into  page
// ==/UserScript==

// Samostatná verzia bez rozšírenia. Použitie:
//  - Tampermonkey / Violentmonkey: nainštaluj tento súbor ako userscript (beží pred skriptami stránky).
//  - Konzola: otvor DevTools (⌥⌘J / Ctrl+Shift+J), vlož celý súbor a stlač Enter.
//  - Záložka: použi focus-bypass.bookmarklet.txt.
// Konzola a záložka sa spustia až po načítaní stránky: skryjú document.hidden / visibilityState /
// hasFocus, visibilitychange, onblur a všetky neskôr pridané listenery, ale `blur` listenery, ktoré
// si stránka cez addEventListener pridala ešte predtým, udalosť dostanú. Spoľahlivý je userscript.
(() => {
  const FLAG = Symbol.for('klaudik.focusGuard');
  if (window[FLAG]) return;
  Object.defineProperty(window, FLAG, { value: true });

  const getter = (proto, prop, value) => {
    try {
      Object.defineProperty(proto, prop, { configurable: true, enumerable: true, get: () => value });
    } catch {
      /* not configurable on this page */
    }
  };
  getter(Document.prototype, 'hidden', false);
  getter(Document.prototype, 'webkitHidden', false);
  getter(Document.prototype, 'visibilityState', 'visible');
  getter(Document.prototype, 'webkitVisibilityState', 'visible');

  const realHasFocus = Document.prototype.hasFocus;
  try {
    Document.prototype.hasFocus = function hasFocus() {
      return true;
    };
  } catch {
    /* ignore */
  }

  const isPageLevel = (t) => t === window || t === document || t === document.documentElement || t === document.body;
  // Element blur/focusout is swallowed only when the whole window lost focus,
  // so moving between fields on the page keeps working.
  const windowLostFocus = () => {
    try {
      return !realHasFocus.call(document);
    } catch {
      return false;
    }
  };

  const stop = (e) => {
    if (isPageLevel(e.target) || windowLostFocus()) e.stopImmediatePropagation();
  };
  for (const type of ['blur', 'focusout']) window.addEventListener(type, stop, true);

  const stopVisibility = (e) => e.stopImmediatePropagation();
  for (const type of ['visibilitychange', 'webkitvisibilitychange']) window.addEventListener(type, stopVisibility, true);

  const stopLeave = (e) => {
    if (!e.relatedTarget && isPageLevel(e.target)) e.stopImmediatePropagation();
  };
  for (const type of ['mouseleave', 'mouseout', 'pointerleave', 'pointerout']) window.addEventListener(type, stopLeave, true);

  // Inline handlers (window.onblur = …, document.onvisibilitychange = …): drop any already set
  // and ignore new ones, so even a late injection silences them.
  const muteHandler = (obj, prop) => {
    try {
      obj[prop] = null;
      Object.defineProperty(obj, prop, { configurable: true, get: () => null, set: () => {} });
    } catch {
      /* ignore */
    }
  };
  for (const prop of ['onblur', 'onfocusout', 'onvisibilitychange', 'onmouseleave', 'onmouseout']) {
    muteHandler(window, prop);
    muteHandler(document, prop);
  }
  if (document.readyState !== 'loading') console.info('Klaudík: odchod z okna je pred touto stránkou skrytý.');
})();
