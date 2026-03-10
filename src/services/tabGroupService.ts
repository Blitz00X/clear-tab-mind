// ============================================================
// Tab Group Service – Brave-style auto-grouping by folder name
// Uses Chrome tabGroups API (MV3)
// ============================================================

interface TabGroupInfo {
    groupId: number;
    folderName: string;
    color: chrome.tabGroups.ColorEnum;
}

const COLORS: chrome.tabGroups.ColorEnum[] = [
    'blue', 'cyan', 'green', 'grey', 'orange', 'pink', 'purple', 'red', 'yellow'
];

function pickColor(index: number): chrome.tabGroups.ColorEnum {
    return COLORS[index % COLORS.length];
}

// -------------------------------------------------------
// Group open tabs by their saved folder name
// Matches open tab URLs against IndexedDB items
// -------------------------------------------------------
export async function groupTabsByFolder(
    itemUrlToFolder: Map<string, { folderId: string; folderName: string; color?: string }>
): Promise<void> {
    if (!chrome.tabGroups) {
        console.warn('[CTM] tabGroups API not available');
        return;
    }

    const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
        chrome.tabs.query({ currentWindow: true }, resolve);
    });

    // Group tabs by folder
    const folderGroups = new Map<string, chrome.tabs.Tab[]>();

    for (const tab of tabs) {
        if (!tab.url || !tab.id) continue;
        const normalizedUrl = normalizeUrl(tab.url);
        const folderInfo = itemUrlToFolder.get(normalizedUrl);
        if (!folderInfo) continue;

        if (!folderGroups.has(folderInfo.folderName)) {
            folderGroups.set(folderInfo.folderName, []);
        }
        folderGroups.get(folderInfo.folderName)!.push(tab);
    }

    // Create tab groups
    let colorIndex = 0;
    for (const [folderName, groupTabs] of folderGroups.entries()) {
        const tabIds = groupTabs.map(t => t.id!).filter(Boolean);
        if (tabIds.length === 0) continue;

        try {
            const groupId = await new Promise<number>((resolve, reject) => {
                chrome.tabs.group({ tabIds }, (gId) => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve(gId);
                });
            });

            await new Promise<void>((resolve) => {
                chrome.tabGroups.update(groupId, {
                    title: folderName,
                    color: pickColor(colorIndex++),
                    collapsed: false,
                }, () => resolve());
            });

            console.log(`[CTM] Grouped ${tabIds.length} tabs into folder "${folderName}"`);
        } catch (err) {
            console.error(`[CTM] Error grouping tabs for folder "${folderName}":`, err);
        }
    }
}

// -------------------------------------------------------
// Collapse a group by name
// -------------------------------------------------------
export async function collapseGroupByName(folderName: string): Promise<void> {
    if (!chrome.tabGroups) return;

    const groups = await new Promise<chrome.tabGroups.TabGroup[]>((resolve) => {
        chrome.tabGroups.query({}, resolve);
    });

    const group = groups.find(g => g.title === folderName);
    if (group) {
        chrome.tabGroups.update(group.id, { collapsed: true });
    }
}

// -------------------------------------------------------
// Ungroup all tabs in current window
// -------------------------------------------------------
export async function ungroupAllTabs(): Promise<void> {
    const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
        chrome.tabs.query({ currentWindow: true }, resolve);
    });

    const tabIds = tabs.map(t => t.id!).filter(Boolean);
    if (tabIds.length > 0) {
        chrome.tabs.ungroup(tabIds);
    }
}

function normalizeUrl(url: string): string {
    try {
        const u = new URL(url);
        u.hash = '';
        ['utm_source', 'utm_medium', 'utm_campaign'].forEach(p => u.searchParams.delete(p));
        return u.href.replace(/\/$/, '');
    } catch {
        return url;
    }
}
