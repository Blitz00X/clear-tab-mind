// ============================================================
// Session Manager – runs as part of the background service worker
// Handles tab hibernation (inactive tabs auto-saved + closed)
// ============================================================

// Tab activity registry (in-memory, lives in background SW)
const tabActivity = new Map<number, { url: string; lastActiveAt: number; windowId: number; index: number }>();

const HIBERNATION_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const ALARM_NAME = 'ctm-hibernation-check';
const ALARM_INTERVAL_MINUTES = 5;

// --------------------------------
// Initialization
// --------------------------------
export function initSessionManager(): void {
    // Set up alarm for periodic hibernation checks
    chrome.alarms.get(ALARM_NAME, (alarm) => {
        if (!alarm) {
            chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_INTERVAL_MINUTES });
        }
    });

    // Track tab activation
    chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
        chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError || !tab?.url) return;
            tabActivity.set(tabId, {
                url: tab.url,
                lastActiveAt: Date.now(),
                windowId,
                index: tab.index,
            });
        });
    });

    // Track URL changes within a tab
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete' && tab.url) {
            const existing = tabActivity.get(tabId);
            if (existing) {
                tabActivity.set(tabId, { ...existing, url: tab.url, lastActiveAt: Date.now() });
            }
        }
    });

    // Remove closed tabs from activity map
    chrome.tabs.onRemoved.addListener((tabId) => {
        tabActivity.delete(tabId);
    });

    // Seed currently open tabs
    chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
            if (tab.id && tab.url && tab.windowId !== undefined) {
                tabActivity.set(tab.id, {
                    url: tab.url,
                    lastActiveAt: Date.now(),
                    windowId: tab.windowId,
                    index: tab.index,
                });
            }
        }
    });

    // Wire alarm handler
    chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === ALARM_NAME) {
            runHibernationCheck();
        }
    });
}

// --------------------------------
// Hibernation logic
// --------------------------------
async function runHibernationCheck(): Promise<void> {
    const now = Date.now();
    const candidates: number[] = [];

    for (const [tabId, record] of tabActivity.entries()) {
        if (now - record.lastActiveAt > HIBERNATION_THRESHOLD_MS) {
            // Skip pinned tabs, extension pages, new tab pages
            try {
                const tab = await new Promise<chrome.tabs.Tab | null>((resolve) => {
                    chrome.tabs.get(tabId, (t) => resolve(chrome.runtime.lastError ? null : t));
                });
                if (!tab || tab.pinned) continue;
                if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) continue;

                candidates.push(tabId);
            } catch {
                // Tab may have been closed already
                tabActivity.delete(tabId);
            }
        }
    }

    for (const tabId of candidates) {
        await hibernateTab(tabId);
    }
}

async function hibernateTab(tabId: number): Promise<void> {
    const record = tabActivity.get(tabId);
    if (!record) return;

    try {
        const tab = await new Promise<chrome.tabs.Tab | null>((resolve) => {
            chrome.tabs.get(tabId, (t) => resolve(chrome.runtime.lastError ? null : t));
        });
        if (!tab) return;

        // Notify UI to save this tab to IndexedDB as hibernated
        chrome.runtime.sendMessage({
            action: 'hibernateTab',
            tabData: {
                url: tab.url || record.url,
                title: tab.title || record.url,
                favicon: tab.favIconUrl,
                windowId: tab.windowId,
                index: tab.index,
                last_accessed_at: new Date(record.lastActiveAt).toISOString(),
            },
        }).catch(() => {/* UI may not be open */ });

        // Close the tab
        chrome.tabs.remove(tabId);
        tabActivity.delete(tabId);

        console.log(`[CTM] Hibernated tab: ${tab.title}`);
    } catch (err) {
        console.error('[CTM] Error hibernating tab:', err);
    }
}

// --------------------------------
// Restore a hibernated tab
// --------------------------------
export async function restoreHibernatedTab(
    url: string,
    windowId?: number,
    index?: number
): Promise<void> {
    await new Promise<void>((resolve) => {
        chrome.tabs.create(
            {
                url,
                windowId: windowId ?? undefined,
                index: index ?? undefined,
                active: true,
            },
            (tab) => {
                if (tab?.id) {
                    tabActivity.set(tab.id, {
                        url,
                        lastActiveAt: Date.now(),
                        windowId: tab.windowId,
                        index: tab.index,
                    });
                }
                resolve();
            }
        );
    });
}
