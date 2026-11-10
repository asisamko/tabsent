// Service worker: keeps the guard registered for the chosen sites and the toolbar badge in sync.

import { ALL, originOf, getSettings, isGuarded, hostOf, hintKey, enableSite, enableAll, reloadTab } from './common.js';

const SCRIPT_ID = 'focus-bypass-guard';
const ACCENT = '#D97757';

chrome.action.setBadgeBackgroundColor({ color: ACCENT });
chrome.action.setBadgeTextColor?.({ color: '#FFFFFF' });

let chain = Promise.resolve();
const serial = (fn) => (chain = chain.then(fn).catch((e) => console.warn('TabSent:', e?.message ?? e)));

/** Register guard.js at document_start in every frame of the enabled sites, in the page's own world. */
function syncScripts() {
  return serial(async () => {
    const { sites, allSites } = await getSettings();
    const matches = allSites ? [ALL] : sites.map(originOf);
    await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] }).catch(() => {});
    if (!matches.length) return;
    await chrome.scripting.registerContentScripts([
      {
        id: SCRIPT_ID,
        js: ['guard.js'],
        matches,
        runAt: 'document_start',
        world: 'MAIN',
        allFrames: true,
        persistAcrossSessions: true,
      },
    ]);
  });
}

async function updateBadge(tab, settings) {
  const host = hostOf(tab.url); // null for pages we have no access to
  const on = isGuarded(host, settings ?? (await getSettings()));
  await chrome.action.setBadgeText({ tabId: tab.id, text: on ? 'ON' : '' }).catch(() => {});
  await chrome.action
    .setTitle({ tabId: tab.id, title: on ? `TabSent – on for ${host}` : 'TabSent' })
    .catch(() => {});
}

async function updateAllBadges() {
  const settings = await getSettings();
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map((t) => updateBadge(t, settings)));
}

chrome.runtime.onInstalled.addListener(() => {
  syncScripts();
  updateAllBadges();
});
chrome.runtime.onStartup.addListener(() => {
  syncScripts();
  updateAllBadges();
});

// The popup asks for this before reloading a page, so the guard is registered at document_start
// before the new document loads.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'syncScripts') {
    syncScripts().then(() => sendResponse(true));
    return true;
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && ('sites' in changes || 'allSites' in changes)) {
    syncScripts();
    updateAllBadges();
  }
});

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  // A new page load runs the registered guard at document_start, so the reload hint is no longer needed.
  if (info.status === 'loading') chrome.storage.session.remove(hintKey(tabId));
  if (info.status === 'loading' || info.url) updateBadge(tab);
});
chrome.tabs.onRemoved.addListener((tabId) => chrome.storage.session.remove(hintKey(tabId)));

// Fallback for when the popup closes while Chrome's permission dialog is open:
// the popup saves what it was about to do in `pending` before asking, and clears it when it finishes itself.
chrome.permissions.onAdded.addListener(({ origins = [] }) => {
  setTimeout(async () => {
    const { pending } = await chrome.storage.session.get('pending');
    if (!pending) return;
    await chrome.storage.session.remove('pending');
    if (Date.now() - (pending.ts ?? 0) > 120000) return; // left over from a popup that was closed long ago
    if (pending.kind === 'all' && origins.includes(ALL)) {
      await enableAll();
      await syncScripts();
      await reloadTab(pending.tabId);
    } else if (pending.kind === 'site' && (origins.includes(originOf(pending.host)) || origins.includes(ALL))) {
      await enableSite(pending.host);
      await syncScripts();
      await reloadTab(pending.tabId);
    }
  }, 1500);
});
