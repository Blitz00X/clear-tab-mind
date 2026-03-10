import { db } from './db';
import type { Item, ItemType, Folder, FolderWithChildren, Workspace, RssFeed, DuplicateGroup } from '../types';

// ============================================================
// Helpers
// ============================================================

function generateId(): string {
    return crypto.randomUUID();
}

function normalizeUrl(url: string): string {
    try {
        const u = new URL(url);
        // Remove trailing slash, fragment, common tracking params
        u.hash = '';
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(p => u.searchParams.delete(p));
        return u.href.replace(/\/$/, '');
    } catch {
        return url.trim();
    }
}

// ============================================================
// Items
// ============================================================

export async function getItems(params?: {
    workspace_id?: string;
    folder_id?: string;
    type?: ItemType;
    status?: string;
}): Promise<Item[]> {
    let query = db.items.orderBy('created_at').reverse();

    if (params?.workspace_id) {
        query = db.items.where('workspace_id').equals(params.workspace_id).reverse() as typeof query;
    }

    let results = await query.toArray();

    if (params?.folder_id !== undefined) {
        results = results.filter(i => i.folder_id === params.folder_id);
    }
    if (params?.type) {
        results = results.filter(i => i.type === params.type);
    }
    if (params?.status) {
        results = results.filter(i => i.status === params.status);
    }

    return results;
}

export async function getItemById(id: string): Promise<Item | undefined> {
    return db.items.get(id);
}

export async function findByUrl(url: string): Promise<Item[]> {
    const normalized = normalizeUrl(url);
    const all = await db.items.toArray();
    return all.filter(i => normalizeUrl(i.url) === normalized);
}

export async function addItem(item: Omit<Item, 'id' | 'created_at'>): Promise<Item> {
    const newItem: Item = {
        ...item,
        id: generateId(),
        created_at: new Date().toISOString(),
    };
    await db.items.add(newItem);
    return newItem;
}

export async function updateItem(id: string, changes: Partial<Item>): Promise<void> {
    await db.items.update(id, changes);
}

export async function deleteItem(id: string): Promise<void> {
    await db.items.delete(id);
}

export async function deleteItems(ids: string[]): Promise<void> {
    await db.items.bulkDelete(ids);
}

export async function getAllItems(): Promise<Item[]> {
    return db.items.orderBy('created_at').reverse().toArray();
}

// ============================================================
// Duplicate Detection
// ============================================================

export async function findDuplicates(): Promise<DuplicateGroup[]> {
    const all = await db.items.toArray();
    const grouped = new Map<string, Item[]>();

    for (const item of all) {
        const key = normalizeUrl(item.url);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(item);
    }

    return Array.from(grouped.entries())
        .filter(([, items]) => items.length > 1)
        .map(([normalizedUrl, items]) => ({ normalizedUrl, items }));
}

export async function cleanupDuplicates(keepOldest: boolean = true): Promise<number> {
    const groups = await findDuplicates();
    const idsToDelete: string[] = [];

    for (const group of groups) {
        const sorted = [...group.items].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        // Keep first (oldest) or last (newest), delete the rest
        const toKeep = keepOldest ? sorted[0] : sorted[sorted.length - 1];
        idsToDelete.push(...sorted.filter(i => i.id !== toKeep.id).map(i => i.id));
    }

    await db.items.bulkDelete(idsToDelete);
    return idsToDelete.length;
}

// ============================================================
// Folders
// ============================================================

export async function getFolders(workspace_id: string): Promise<Folder[]> {
    return db.folders.where('workspace_id').equals(workspace_id).toArray();
}

export async function getFolderTree(workspace_id: string): Promise<FolderWithChildren[]> {
    const folders = await getFolders(workspace_id);
    const items = await getItems({ workspace_id });

    const countMap = new Map<string, { total: number; unread: number }>();
    for (const item of items) {
        const key = item.folder_id ?? '__root__';
        const existing = countMap.get(key) ?? { total: 0, unread: 0 };
        existing.total++;
        if (item.status === 'unread') existing.unread++;
        countMap.set(key, existing);
    }

    function buildTree(parentId: string | null | undefined): FolderWithChildren[] {
        return folders
            .filter(f => (f.parent_id ?? null) === (parentId ?? null))
            .sort((a, b) => a.order - b.order)
            .map(f => {
                const counts = countMap.get(f.id) ?? { total: 0, unread: 0 };
                return {
                    ...f,
                    children: buildTree(f.id),
                    itemCount: counts.total,
                    unreadCount: counts.unread,
                };
            });
    }

    return buildTree(null);
}

export async function addFolder(folder: Omit<Folder, 'id' | 'created_at'>): Promise<Folder> {
    const newFolder: Folder = {
        ...folder,
        id: generateId(),
        created_at: new Date().toISOString(),
    };
    await db.folders.add(newFolder);
    return newFolder;
}

export async function updateFolder(id: string, changes: Partial<Folder>): Promise<void> {
    await db.folders.update(id, changes);
}

export async function deleteFolder(id: string): Promise<void> {
    // Move items in this folder to no folder (unfiled)
    const items = await db.items.where('folder_id').equals(id).toArray();
    await Promise.all(items.map(i => db.items.update(i.id, { folder_id: undefined })));
    // Also delete all child folders (recursively)
    const children = await db.folders.where('parent_id').equals(id).toArray();
    await Promise.all(children.map(c => deleteFolder(c.id)));
    await db.folders.delete(id);
}

// ============================================================
// Workspaces
// ============================================================

export async function getWorkspaces(): Promise<Workspace[]> {
    return db.workspaces.orderBy('created_at').toArray();
}

export async function getActiveWorkspace(): Promise<Workspace | undefined> {
    const all = await db.workspaces.toArray();
    return all.find(w => w.is_active) ?? all[0];
}

export async function addWorkspace(workspace: Omit<Workspace, 'id' | 'created_at' | 'is_active'>): Promise<Workspace> {
    const newWs: Workspace = {
        ...workspace,
        id: generateId(),
        is_active: false,
        created_at: new Date().toISOString(),
    };
    await db.workspaces.add(newWs);
    return newWs;
}

export async function setActiveWorkspace(id: string): Promise<void> {
    const all = await db.workspaces.toArray();
    await Promise.all(all.map(w => db.workspaces.update(w.id, { is_active: w.id === id })));
}

export async function updateWorkspace(id: string, changes: Partial<Workspace>): Promise<void> {
    await db.workspaces.update(id, changes);
}

export async function deleteWorkspace(id: string): Promise<void> {
    await db.items.where('workspace_id').equals(id).delete();
    const folders = await db.folders.where('workspace_id').equals(id).toArray();
    await db.folders.bulkDelete(folders.map(f => f.id));
    await db.workspaces.delete(id);
}

// ============================================================
// RSS Feeds
// ============================================================

export async function getRssFeeds(workspace_id: string): Promise<RssFeed[]> {
    return db.rss_feeds.where('workspace_id').equals(workspace_id).toArray();
}

export async function addRssFeed(feed: Omit<RssFeed, 'id' | 'created_at' | 'error_count'>): Promise<RssFeed> {
    const newFeed: RssFeed = {
        ...feed,
        id: generateId(),
        error_count: 0,
        created_at: new Date().toISOString(),
    };
    await db.rss_feeds.add(newFeed);
    return newFeed;
}

export async function updateRssFeed(id: string, changes: Partial<RssFeed>): Promise<void> {
    await db.rss_feeds.update(id, changes);
}

export async function deleteRssFeed(id: string): Promise<void> {
    await db.rss_feeds.delete(id);
}
