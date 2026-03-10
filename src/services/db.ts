import Dexie, { type Table } from 'dexie';
import type { Item, Folder, Workspace, RssFeed } from '../types';

// ============================================================
// Clear Tab Mind – Dexie.js Database (IndexedDB)
// ============================================================

export class ClearTabMindDB extends Dexie {
    items!: Table<Item, string>;
    folders!: Table<Folder, string>;
    workspaces!: Table<Workspace, string>;
    rss_feeds!: Table<RssFeed, string>;

    constructor() {
        super('ClearTabMindDB');

        this.version(1).stores({
            // Primary key + indexed fields
            items: 'id, folder_id, workspace_id, type, url, status, created_at, last_accessed_at',
            folders: 'id, parent_id, workspace_id, order',
            workspaces: 'id, is_active, created_at',
            rss_feeds: 'id, folder_id, workspace_id, last_fetched',
        });
    }
}

// Singleton instance – safe to import anywhere in the React app
export const db = new ClearTabMindDB();

// ============================================================
// Seed defaults on first run
// ============================================================
export async function seedDefaultData(): Promise<void> {
    const workspaceCount = await db.workspaces.count();
    if (workspaceCount > 0) return;

    const defaultWorkspaceId = crypto.randomUUID();

    await db.workspaces.add({
        id: defaultWorkspaceId,
        name: 'Personal',
        description: 'Default workspace',
        color: '#6366f1',
        icon: '🏠',
        is_active: true,
        created_at: new Date().toISOString(),
    });

    const rootFolderId = crypto.randomUUID();
    await db.folders.add({
        id: rootFolderId,
        name: 'General',
        parent_id: null,
        workspace_id: defaultWorkspaceId,
        color: '#6366f1',
        icon: '📁',
        order: 0,
        created_at: new Date().toISOString(),
    });
}
