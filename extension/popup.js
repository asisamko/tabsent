import { ALL, originOf, pageInfo, getSettings, hintKey, enableSite, disableSite, enableAll, disableAll } from './common.js';

const $ = (id) => document.getElementById(id);
const els = {
  site: $('site'), host: $('host'), statusText: $('statusText'), siteToggle: $('siteToggle'),
  blocked: $('blocked'), hint: $('hint'), hintText: $('hintText'), reload: $('reload'),
  allToggle: $('allToggle'), list: $('list'), count: $('count'), empty: $('empty'), error: $('error'),
};

// `?tab=<id>` targets a specific tab (used when the popup is opened as a normal page, e.g. in tests).
const forcedTab = Number(new URLSearchParams(location.search).get('tab')) || null;
let tab = null;
let page = {};
let state = { siteOn: false, allOn: false };

const has = (origins) => chrome.permissions.contains({ origins }).catch(() => false);

async function render() {
  const settings = await getSettings();
  const allOn = settings.allSites && (await has([ALL]));
  const granted = await Promise.all(settings.sites.map((h) => has([originOf(h)])));
  const listed = settings.sites.includes(page.host);
  const siteOn = Boolean(page.host) && (allOn || (listed && granted[settings.sites.indexOf(page.host)]));
  state = { siteOn, allOn };

  // Current site
  els.host.textContent = page.host ?? 'This page';
  els.site.classList.toggle('on', siteOn);
  els.site.classList.toggle('off-limits', !page.host);
  els.statusText.textContent = !page.host
    ? 'Not available here'
    : siteOn
      ? allOn && !listed ? 'Protected · all sites' : 'Protected'
      : 'Off';
  els.siteToggle.setAttribute('aria-checked', String(siteOn));
  els.siteToggle.disabled = !page.host || allOn;
  els.siteToggle.title = allOn ? 'On because “All sites” is on' : '';
  els.blocked.hidden = Boolean(page.host);
  els.blocked.textContent = page.reason ?? '';

  // Reload hint
  const hint = tab ? (await chrome.storage.session.get(hintKey(tab.id)))[hintKey(tab.id)] : null;
  els.hint.hidden = !page.host || !hint;
  els.hintText.textContent =
    hint === 'off'
      ? 'Still active on this page until you reload it.'
      : 'On for this page now. Reload once so it also starts before the page’s own scripts.';

  // All sites
  els.allToggle.setAttribute('aria-checked', String(allOn));

  // Site list
  els.list.replaceChildren(
    ...settings.sites.map((host, i) => {
      const li = document.createElement('li');
      li.classList.toggle('current', host === page.host);
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = host;
      name.title = host;
      li.append(name);
      if (!granted[i] && !allOn) {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = 'no access';
        tag.title = 'Site access was removed in Chrome. Switch the site on again to allow it.';
        li.append(tag);
      }
      const rm = document.createElement('button');
      rm.className = 'remove';
      rm.textContent = '×';
      rm.title = `Remove ${host}`;
      rm.setAttribute('aria-label', `Remove ${host}`);
      rm.addEventListener('click', () => run(() => disableSite(host)));
      li.append(rm);
      return li;
    }),
  );
  els.count.textContent = settings.sites.length ? `(${settings.sites.length})` : '';
  els.empty.hidden = settings.sites.length > 0;
}

function run(fn) {
  els.error.hidden = true;
  return Promise.resolve()
    .then(fn)
    .catch((e) => showError(e?.message ?? String(e)))
    .finally(render);
}

function showError(msg) {
  els.error.textContent = msg;
  els.error.hidden = false;
}

/**
 * Ask Chrome for host access. Must start synchronously inside the click (user gesture).
 * `pending` lets the service worker finish the job if the popup closes while the dialog is open.
 */
function requestAccess(origins, pending, onGranted, deniedMsg) {
  chrome.storage.session.set({ pending });
  const request = chrome.permissions.request({ origins });
  run(async () => {
    const ok = await request;
    await chrome.storage.session.remove('pending');
    if (ok) await onGranted();
    else showError(deniedMsg);
  });
}

els.siteToggle.addEventListener('click', () => {
  const { host } = page;
  if (!host || state.allOn) return;
  if (state.siteOn) run(() => disableSite(host));
  else requestAccess([originOf(host)], { kind: 'site', host }, () => enableSite(host), 'Chrome didn’t allow access to this site.');
});

els.allToggle.addEventListener('click', () => {
  if (state.allOn) run(disableAll);
  else requestAccess([ALL], { kind: 'all' }, enableAll, 'Chrome didn’t allow access to all sites.');
});

els.reload.addEventListener('click', async () => {
  if (!tab) return;
  await chrome.tabs.reload(tab.id);
  if (!forcedTab) window.close();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' || (tab && hintKey(tab.id) in changes)) render();
});

(async () => {
  tab = forcedTab
    ? await chrome.tabs.get(forcedTab).catch(() => null)
    : (await chrome.tabs.query({ active: true, currentWindow: true }))[0] ?? null;
  page = pageInfo(tab?.url);
  await render();
})();
