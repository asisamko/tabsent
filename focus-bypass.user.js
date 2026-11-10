// ==UserScript==
// @name         TabSent
// @namespace    https://github.com/asisamko/tabsent
// @version      1.1.1
// @description  Stop websites from noticing that you switched to another window or tab (blur / visibilitychange / hasFocus).
// @homepageURL  https://github.com/asisamko/tabsent
// @downloadURL  https://raw.githubusercontent.com/asisamko/tabsent/main/focus-bypass.user.js
// @updateURL    https://raw.githubusercontent.com/asisamko/tabsent/main/focus-bypass.user.js
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @inject-into  page
// ==/UserScript==

// How to use: see README.md (userscript, bookmarklet or console).
(() => {
  const FLAG = Symbol.for('tabSent');
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
  if (document.readyState !== 'loading') console.info('TabSent: focus changes are now hidden from this page.');
})();
