import { db } from './db';
import type { Item } from '../types';

// ============================================================
// Workspace Context Switching Service
// On switch: saves current open tabs as hibernated items,
// closes them, then restores the target workspace's hibernated tabs.
// ============================================================

// -------------------------------------------------------
// Save all currently open tabs into IndexedDB as hibernated
// items belonging to the specified workspace
// -------------------------------------------------------
export async function saveCurrentTabsToWorkspace(workspaceId: string): Promise<void> {
    const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
        chrome.tabs.query({ currentWindow: true }, resolve);
    });

    const itemsToAdd: Item[] = [];

    for (const tab of tabs) {
        if (!tab.url || !tab.id) continue;
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) continue;

        const item: Item = {
            id: crypto.randomUUID(),
            title: tab.title || tab.url,
            url: tab.url,
            favicon: tab.favIconUrl,
            type: 'Tab',
            status: 'hibernated',
            tags: [],
            workspace_id: workspaceId,
            created_at: new Date().toISOString(),
            last_accessed_at: new Date().toISOString(),
            original_window_id: tab.windowId,
            original_index: tab.index,
        };
        itemsToAdd.push(item);
    }

    if (itemsToAdd.length > 0) {
        await db.items.bulkAdd(itemsToAdd);
        console.log(`[CTM] Saved ${itemsToAdd.length} tabs for workspace ${workspaceId}`);
    }

    // Close all saved tabs
    const tabIds = tabs.map(t => t.id!).filter(Boolean);
    if (tabIds.length > 0) {
        await new Promise<void>((resolve) => {
            chrome.tabs.remove(tabIds, () => resolve());
        });
    }
}

// -------------------------------------------------------
// Restore hibernated tabs belonging to a workspace
// -------------------------------------------------------
export async function restoreWorkspaceTabs(workspaceId: string): Promise<void> {
    const hibernated = await db.items
        .where('[workspace_id+status]')
        .equals([workspaceId, 'hibernated'])
        .toArray()
        .catch(async () => {
            // Fallback if compound index not available
            return db.items
                .where('workspace_id').equals(workspaceId)
                .filter(i => i.status === 'hibernated')
                .toArray();
        });

    if (hibernated.length === 0) {
        // Nothing to restore – open a new tab
        chrome.tabs.create({ url: 'chrome://newtab' });
        return;
    }

    // Sort by original_index to preserve order
    const sorted = [...hibernated].sort((a, b) =>
        (a.original_index ?? 999) - (b.original_index ?? 999)
    );

    for (const item of sorted) {
        await new Promise<void>((resolve) => {
            chrome.tabs.create({ url: item.url, active: false }, () => resolve());
        });
        // Mark as unread (un-hibernated) after restoring
        await db.items.update(item.id, { status: 'unread' });
    }

    console.log(`[CTM] Restored ${sorted.length} tabs for workspace ${workspaceId}`);
}

// -------------------------------------------------------
// Full workspace switch
// -------------------------------------------------------
export async function switchWorkspace(
    fromWorkspaceId: string,
    toWorkspaceId: string
): Promise<void> {
    console.log(`[CTM] Switching workspace: ${fromWorkspaceId} → ${toWorkspaceId}`);

    // 1. Save current tabs to from-workspace
    await saveCurrentTabsToWorkspace(fromWorkspaceId);

    // 2. Mark from-workspace as inactive
    await db.workspaces.update(fromWorkspaceId, { is_active: false });

    // 3. Mark to-workspace as active
    await db.workspaces.update(toWorkspaceId, { is_active: true });

    // 4. Restore hibernated tabs for the target workspace
    await restoreWorkspaceTabs(toWorkspaceId);
}
