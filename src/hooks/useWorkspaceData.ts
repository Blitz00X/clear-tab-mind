import { useState, useEffect, useCallback } from 'react';
import { db, seedDefaultData } from '../services/db';
import * as DS from '../services/dataService';
import { fetchAndParseFeed, normalizeRssUrl } from '../services/rssParser';
import { scrapeMetadata, detectItemType } from '../services/linkScraper';
import type { Item, Folder, FolderWithChildren, Workspace, RssFeed } from '../types';

// ============================================================
// useWorkspaceData – master hook for the dashboard & side panel
// ============================================================

export function useWorkspaceData() {
    const [items, setItems] = useState<Item[]>([]);
    const [folders, setFolders] = useState<FolderWithChildren[]>([]);
    const [flatFolders, setFlatFolders] = useState<Folder[]>([]);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeWorkspace, setActiveWorkspace] = useState<Workspace | undefined>();
    const [rssFeeds, setRssFeeds] = useState<RssFeed[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

    const reload = useCallback(async () => {
        try {
            const ws = await DS.getWorkspaces();
            const active = ws.find(w => w.is_active) ?? ws[0];
            setWorkspaces(ws);
            setActiveWorkspace(active);

            if (active) {
                const [allItems, tree, flat, feeds] = await Promise.all([
                    DS.getItems({ workspace_id: active.id }),
                    DS.getFolderTree(active.id),
                    DS.getFolders(active.id),
                    DS.getRssFeeds(active.id),
                ]);
                setItems(allItems);
                setFolders(tree);
                setFlatFolders(flat);
                setRssFeeds(feeds);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        seedDefaultData().then(reload);
    }, [reload]);

    // Listen for hibernation messages from background
    useEffect(() => {
        if (typeof chrome === 'undefined') return;
        const handler = async (msg: { action: string; tabData?: Partial<Item> }) => {
            if (msg.action === 'hibernateTab' && msg.tabData && activeWorkspace) {
                await DS.addItem({
                    title: msg.tabData.title || 'Untitled',
                    url: msg.tabData.url || '',
                    favicon: msg.tabData.favicon,
                    type: 'Tab',
                    status: 'hibernated',
                    tags: [],
                    workspace_id: activeWorkspace.id,
                    original_window_id: msg.tabData.original_window_id,
                    original_index: msg.tabData.original_index,
                    last_accessed_at: msg.tabData.last_accessed_at,
                });
                await reload();
            }
            if (msg.action === 'addItemFromContext' && (msg as unknown as { url: string }).url && activeWorkspace) {
                const data = msg as unknown as { url: string; title?: string };
                await addItem(data.url, data.title);
            }
            if (msg.action === 'triggerRssPoll') {
                await pollAllFeeds();
            }
        };
        chrome.runtime.onMessage.addListener(handler);
        return () => chrome.runtime.onMessage.removeListener(handler);
    }, [activeWorkspace, reload]);

    // ── Items ──────────────────────────────────────────────
    const addItem = useCallback(async (url: string, title?: string, folderId?: string) => {
        if (!activeWorkspace) return;

        // Check for duplicates
        const existing = await DS.findByUrl(url);
        if (existing.length > 0) return existing[0];

        // Detect item type and scrape metadata
        const type = detectItemType(url);
        const meta = await scrapeMetadata(url).catch(() => ({}));

        const newItem = await DS.addItem({
            title: meta.title || title || url,
            url,
            favicon: meta.favicon,
            thumbnail_url: meta.thumbnail_url,
            type,
            status: 'unread',
            tags: [],
            folder_id: folderId,
            workspace_id: activeWorkspace.id,
            metadata: {
                duration: (meta as { duration?: number }).duration,
                channelName: (meta as { channelName?: string }).channelName,
                channelUrl: (meta as { channelUrl?: string }).channelUrl,
                platform: (meta as { platform?: string }).platform,
            },
        });

        await reload();
        return newItem;
    }, [activeWorkspace, reload]);

    const updateItem = useCallback(async (id: string, changes: Partial<Item>) => {
        await DS.updateItem(id, changes);
        await reload();
    }, [reload]);

    const deleteItem = useCallback(async (id: string) => {
        await DS.deleteItem(id);
        await reload();
    }, [reload]);

    const openItem = useCallback((item: Item) => {
        window.open(item.url, '_blank');
        DS.updateItem(item.id, { status: 'read', last_accessed_at: new Date().toISOString() });
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'read' } : i));
    }, []);

    // ── Folders ────────────────────────────────────────────
    const addFolder = useCallback(async (name: string, parentId: string | null) => {
        if (!activeWorkspace) return;
        await DS.addFolder({
            name,
            parent_id: parentId,
            workspace_id: activeWorkspace.id,
            icon: '📁',
            order: Date.now(),
        });
        await reload();
    }, [activeWorkspace, reload]);

    const renameFolder = useCallback(async (id: string, name: string) => {
        await DS.updateFolder(id, { name });
        await reload();
    }, [reload]);

    const deleteFolder = useCallback(async (id: string) => {
        await DS.deleteFolder(id);
        await reload();
    }, [reload]);

    // ── Workspaces ─────────────────────────────────────────
    const switchWorkspace = useCallback(async (toId: string) => {
        if (!activeWorkspace || toId === activeWorkspace.id) return;
        await DS.setActiveWorkspace(toId);
        setSelectedFolderId(null);
        await reload();
    }, [activeWorkspace, reload]);

    const addWorkspace = useCallback(async (name: string, color: string) => {
        await DS.addWorkspace({ name, color, icon: '🗂️' });
        await reload();
    }, [reload]);

    // ── RSS ────────────────────────────────────────────────
    const addRssFeed = useCallback(async (feed: Pick<RssFeed, 'url' | 'name' | 'folder_id' | 'fetch_interval_minutes'>) => {
        if (!activeWorkspace) return;
        await DS.addRssFeed({ ...feed, workspace_id: activeWorkspace.id });
        await reload();
        // Immediately poll
        await pollFeed(feed.url, feed.folder_id);
    }, [activeWorkspace, reload]);

    const deleteRssFeed = useCallback(async (id: string) => {
        await DS.deleteRssFeed(id);
        await reload();
    }, [reload]);

    const pollFeed = useCallback(async (feedUrl: string, folderId?: string) => {
        if (!activeWorkspace) return;
        try {
            const entries = await fetchAndParseFeed(feedUrl);
            for (const entry of entries) {
                const exists = await DS.findByUrl(entry.url);
                if (exists.length > 0) continue;
                await DS.addItem({
                    title: entry.title,
                    url: entry.url,
                    thumbnail_url: entry.thumbnail,
                    type: 'RSS_Feed',
                    status: 'unread',
                    tags: [],
                    folder_id: folderId,
                    workspace_id: activeWorkspace.id,
                    note: entry.summary?.slice(0, 300),
                });
            }
            await reload();
        } catch (err) {
            console.error('[CTM] RSS poll error:', err);
        }
    }, [activeWorkspace, reload]);

    const pollAllFeeds = useCallback(async () => {
        if (!activeWorkspace) return;
        const feeds = await DS.getRssFeeds(activeWorkspace.id);
        await Promise.all(feeds.map(f => pollFeed(f.url, f.folder_id)));
    }, [activeWorkspace, pollFeed]);

    const refreshRssFeed = useCallback(async (id: string) => {
        const feed = rssFeeds.find(f => f.id === id);
        if (!feed) return;
        await pollFeed(feed.url, feed.folder_id);
        await DS.updateRssFeed(id, { last_fetched: new Date().toISOString() });
        await reload();
    }, [rssFeeds, pollFeed, reload]);

    // ── Duplicate cleanup ──────────────────────────────────
    const cleanupDuplicates = useCallback(async () => {
        const removed = await DS.cleanupDuplicates(true);
        await reload();
        return removed;
    }, [reload]);

    // ── Filtered items ─────────────────────────────────────
    const filteredItems = selectedFolderId === null
        ? items
        : items.filter(i => i.folder_id === selectedFolderId);

    return {
        items,
        filteredItems,
        folders,
        flatFolders,
        workspaces,
        activeWorkspace,
        rssFeeds,
        loading,
        selectedFolderId,
        setSelectedFolderId,
        addItem,
        updateItem,
        deleteItem,
        openItem,
        addFolder,
        renameFolder,
        deleteFolder,
        switchWorkspace,
        addWorkspace,
        addRssFeed,
        deleteRssFeed,
        refreshRssFeed,
        cleanupDuplicates,
        reload,
    };
}
