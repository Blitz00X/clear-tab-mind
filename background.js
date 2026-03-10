// ============================================================
// Clear Tab Mind – Background Service Worker (MV3)
// Handles: context menus, side panel, tab activity, alarms,
// RSS polling, hibernation, workspace switching messages
// ============================================================

// ─────────────────────────────────────────────
// 1. Tab activity tracking (for hibernation)
// ─────────────────────────────────────────────
const tabActivity = new Map();

function updateTabActivity(tabId, url, windowId, index) {
  tabActivity.set(tabId, {
    url,
    lastActiveAt: Date.now(),
    windowId,
    index,
  });
}

// ─────────────────────────────────────────────
// 2. Installation / startup
// ─────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[CTM] Extension installed');

  chrome.contextMenus.create({
    id: 'addToClearTabMind',
    title: 'Add to Clear Tab Mind',
    contexts: ['link', 'page'],
  });

  // Create hibernation check alarm
  chrome.alarms.get('ctm-hibernation-check', (alarm) => {
    if (!alarm) chrome.alarms.create('ctm-hibernation-check', { periodInMinutes: 5 });
  });

  // Create RSS polling alarm
  chrome.alarms.get('ctm-rss-poll', (alarm) => {
    if (!alarm) chrome.alarms.create('ctm-rss-poll', { periodInMinutes: 60 });
  });
});

// Seed tab activity on startup
chrome.tabs.query({}, (tabs) => {
  for (const tab of tabs) {
    if (tab.id && tab.url) updateTabActivity(tab.id, tab.url, tab.windowId, tab.index);
  }
});

// ─────────────────────────────────────────────
// 3. Side Panel
// ─────────────────────────────────────────────
chrome.action.onClicked.addListener(async (tab) => {
  if (!chrome.sidePanel?.open) {
    console.warn('[CTM] Side panel API unavailable');
    return;
  }
  try {
    if (typeof tab?.id === 'number') {
      await chrome.sidePanel.setOptions({ tabId: tab.id, path: 'sidepanel.html' });
      await chrome.sidePanel.open({ tabId: tab.id });
    } else if (typeof tab?.windowId === 'number') {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } else {
      await chrome.sidePanel.open({});
    }
  } catch (err) {
    console.error('[CTM] Side panel error:', err);
  }
});

// ─────────────────────────────────────────────
// 4. Tab tracking events
// ─────────────────────────────────────────────
chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab?.url) return;
    updateTabActivity(tabId, tab.url, windowId, tab.index);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const existing = tabActivity.get(tabId);
    if (existing) updateTabActivity(tabId, tab.url, tab.windowId, tab.index);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabActivity.delete(tabId);
});

// ─────────────────────────────────────────────
// 5. Alarm handlers
// ─────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'ctm-hibernation-check') {
    await runHibernationCheck();
  }
  if (alarm.name === 'ctm-rss-poll') {
    // Notify any open dashboard/sidepanel pages to run RSS poll
    chrome.runtime.sendMessage({ action: 'triggerRssPoll' }).catch(() => { });
  }
});

async function runHibernationCheck() {
  const THRESHOLD = 30 * 60 * 1000; // 30 min
  const now = Date.now();

  for (const [tabId, record] of tabActivity.entries()) {
    if (now - record.lastActiveAt < THRESHOLD) continue;

    try {
      const tab = await new Promise((resolve) => {
        chrome.tabs.get(tabId, (t) => resolve(chrome.runtime.lastError ? null : t));
      });
      if (!tab || tab.pinned) continue;
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) continue;

      // Notify UI to save the tab
      chrome.runtime.sendMessage({
        action: 'hibernateTab',
        tabData: {
          url: tab.url,
          title: tab.title || tab.url,
          favicon: tab.favIconUrl || '',
          windowId: tab.windowId,
          index: tab.index,
          last_accessed_at: new Date(record.lastActiveAt).toISOString(),
        },
      }).catch(() => { });

      chrome.tabs.remove(tabId);
      tabActivity.delete(tabId);
      console.log(`[CTM] Hibernated: ${tab.title}`);
    } catch (err) {
      console.error('[CTM] Hibernation error:', err);
    }
  }
}

// ─────────────────────────────────────────────
// 6. Context menu
// ─────────────────────────────────────────────
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'addToClearTabMind') {
    const url = info.linkUrl || tab?.url;
    if (!url) return;
    chrome.runtime.sendMessage({
      action: 'addItemFromContext',
      url,
      title: info.linkText || tab?.title || url,
      tabId: tab?.id,
    }).catch(() => { });

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Clear Tab Mind',
      message: `Saved: "${info.linkText || tab?.title || url}"`,
    });
  }
});

// ─────────────────────────────────────────────
// 7. Message bridge for content scripts / popup
// ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'getCurrentTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] || null });
    });
    return true;
  }

  if (request.action === 'openDashboard') {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    sendResponse({ ok: true });
    return true;
  }

  if (request.action === 'openTab') {
    chrome.tabs.create({ url: request.url, active: true });
    sendResponse({ ok: true });
    return true;
  }

  if (request.action === 'groupTabsByFolder') {
    // Delegate to the React side which has access to Dexie
    chrome.runtime.sendMessage({ action: 'doGroupTabs' }).catch(() => { });
    sendResponse({ ok: true });
    return true;
  }

  if (request.action === 'switchWorkspace') {
    // The UI handles the actual Dexie ops and then calls tabs.create etc.
    // Background just relays and opens notification
    chrome.runtime.sendMessage({
      action: 'doSwitchWorkspace',
      fromId: request.fromId,
      toId: request.toId,
    }).catch(() => { });
    sendResponse({ ok: true });
    return true;
  }

  // Ping (keep alive)
  if (request.action === 'ping') {
    sendResponse({ pong: true });
    return true;
  }
});
