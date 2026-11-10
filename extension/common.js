// Shared by the popup and the service worker.
// Settings (chrome.storage.local): sites = ['example.com', …], allSites = boolean.
// Reload hints (chrome.storage.session): 'hint:<tabId>' = 'on' | 'off' until that tab reloads.

export const ALL = '*://*/*';
export const originOf = (host) => `*://${host}/*`;

const STORE_HOSTS = ['chromewebstore.google.com', 'chrome.google.com'];

/** What the popup can do on a URL: { host } or { reason } why it can't run there. */
export function pageInfo(url) {
  if (!url) return { reason: 'Chrome doesn’t allow extensions on this page (chrome:// pages, new tab, Web Store…).' };
  let u;
  try {
    u = new URL(url);
  } catch {
    return { reason: 'This page can’t be protected.' };
  }
  if (u.protocol === 'file:') return { reason: 'Local files aren’t supported. Open the page from a website instead.' };
  if (!/^https?:$/.test(u.protocol)) return { reason: 'Chrome doesn’t allow extensions on its own pages (chrome://, new tab, settings…).' };
  if (STORE_HOSTS.includes(u.hostname) && (u.hostname !== 'chrome.google.com' || u.pathname.startsWith('/webstore')))
    return { reason: 'Chrome doesn’t allow extensions on the Chrome Web Store.' };
  return { host: u.hostname };
}

export const hostOf = (url) => pageInfo(url).host ?? null;

export async function getSettings() {
  const { sites = [], allSites = false } = await chrome.storage.local.get(['sites', 'allSites']);
  return { sites, allSites };
}

export const isGuarded = (host, { sites, allSites }) => Boolean(host) && (allSites || sites.includes(host));

export const hintKey = (tabId) => `hint:${tabId}`;

async function setHints(tabIds, mode) {
  if (tabIds.length) await chrome.storage.session.set(Object.fromEntries(tabIds.map((id) => [hintKey(id), mode])));
}

/** Reload a tab after enabling, so the guard runs at document_start before the page's own scripts. */
export async function reloadTab(tabId) {
  if (!tabId) return;
  await chrome.tabs.reload(tabId).catch(() => {});
}

/** Tabs currently showing a page of `host` (needs host access). */
async function tabsOf(host) {
  return (await chrome.tabs.query({ url: originOf(host) }).catch(() => [])).filter((t) => hostOf(t.url) === host);
}

async function inject(tabIds) {
  const done = [];
  await Promise.all(
    tabIds.map((tabId) =>
      chrome.scripting
        .executeScript({ target: { tabId, allFrames: true }, files: ['guard.js'], world: 'MAIN', injectImmediately: true })
        .then(() => done.push(tabId), () => {}),
    ),
  );
  return done;
}

/** Whether the guard is running in the tab's top frame right now. */
async function guardPresent(tabId) {
  try {
    const [r] = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => Boolean(window[Symbol.for('tabSent')]),
    });
    return r?.result === true;
  } catch {
    return false;
  }
}

async function withGuard(tabs) {
  const present = await Promise.all(tabs.map((t) => guardPresent(t.id)));
  return tabs.filter((_, i) => present[i]).map((t) => t.id);
}

/** Start protecting `host` (host access must already be granted). Safe to call twice. */
export async function enableSite(host) {
  const s = await getSettings();
  if (!s.sites.includes(host)) await chrome.storage.local.set({ sites: [...s.sites, host].sort() });
  if (s.allSites) return;
  await setHints(await inject((await tabsOf(host)).map((t) => t.id)), 'on');
}

export async function disableSite(host) {
  const s = await getSettings();
  const affected = s.allSites ? [] : await withGuard(await tabsOf(host));
  await chrome.storage.local.set({ sites: s.sites.filter((h) => h !== host) });
  await chrome.permissions.remove({ origins: [originOf(host)] }).catch(() => {});
  await setHints(affected, 'off');
}

/** Protect every website (access to all sites must already be granted). */
export async function enableAll() {
  const s = await getSettings();
  if (s.allSites) return;
  await chrome.storage.local.set({ allSites: true });
  const tabs = (await chrome.tabs.query({})).filter((t) => {
    const host = hostOf(t.url);
    return host && !s.sites.includes(host);
  });
  await setHints(await inject(tabs.map((t) => t.id)), 'on');
}

export async function disableAll() {
  const s = await getSettings();
  const tabs = (await chrome.tabs.query({})).filter((t) => {
    const host = hostOf(t.url);
    return host && !s.sites.includes(host);
  });
  const affected = await withGuard(tabs);
  await chrome.storage.local.set({ allSites: false });
  await chrome.permissions.remove({ origins: [ALL] }).catch(() => {});
  await setHints(affected, 'off');
}
