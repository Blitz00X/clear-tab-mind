import { useEffect, useState, useCallback, useRef } from 'react';
import { Command } from 'cmdk';
import { Search, Globe, Folder, Layers, Plus, Rss, MoonStar, RefreshCw, X } from 'lucide-react';
import type { Item, Workspace, FolderWithChildren } from '../types';

// ============================================================
// CommandPalette – Ctrl+Shift+K quick action bar
// ============================================================

interface CommandPaletteProps {
    items: Item[];
    workspaces: Workspace[];
    folders: FolderWithChildren[];
    currentWorkspaceId?: string;
    onOpenItem: (item: Item) => void;
    onSwitchWorkspace: (id: string) => void;
    onAddRss: () => void;
    onGroupTabs: () => void;
    onAddItem: () => void;
}

const TYPE_ICONS: Record<string, string> = {
    Tab: '🌐',
    Video: '🎬',
    RSS_Feed: '📡',
    Note: '📝',
};

export function CommandPalette({
    items,
    workspaces,
    folders,
    currentWorkspaceId,
    onOpenItem,
    onSwitchWorkspace,
    onAddRss,
    onGroupTabs,
    onAddItem,
}: CommandPaletteProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Global keyboard shortcut: Ctrl+Shift+K
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setOpen(o => !o);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Also listen for messages from background
    useEffect(() => {
        if (typeof chrome === 'undefined') return;
        const handler = (msg: { action: string }) => {
            if (msg.action === 'openCommandPalette') setOpen(true);
        };
        chrome.runtime.onMessage.addListener(handler);
        return () => chrome.runtime.onMessage.removeListener(handler);
    }, []);

    const close = useCallback(() => {
        setOpen(false);
        setQuery('');
    }, []);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                close();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open, close]);

    if (!open) return null;

    const filteredItems = query
        ? items.filter(i =>
            i.title.toLowerCase().includes(query.toLowerCase()) ||
            i.url.toLowerCase().includes(query.toLowerCase()) ||
            i.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
        ).slice(0, 8)
        : items.slice(0, 5);

    const filteredWorkspaces = query
        ? workspaces.filter(w => w.name.toLowerCase().includes(query.toLowerCase()))
        : workspaces;

    const filteredFolders = query
        ? folders.filter(f => f.name.toLowerCase().includes(query.toLowerCase())).slice(0, 4)
        : [];

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

            <div
                ref={containerRef}
                className="relative w-full max-w-xl mx-4 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl overflow-hidden"
            >
                <Command label="Command palette" shouldFilter={false}>
                    {/* Search input */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Command.Input
                            autoFocus
                            value={query}
                            onValueChange={setQuery}
                            placeholder="Search tabs, switch workspaces, run commands…"
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">esc</kbd>
                        </div>
                        <button onClick={close} className="hover:bg-muted rounded-lg p-0.5 text-muted-foreground">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <Command.List className="max-h-[400px] overflow-y-auto p-2">
                        {/* Quick actions */}
                        <Command.Group heading={<span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2">Quick Actions</span>}>
                            <Command.Item
                                onSelect={() => { onAddItem(); close(); }}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm hover:bg-muted/60 aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                            >
                                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Plus className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium">Add new item</p>
                                    <p className="text-xs text-muted-foreground">Save a tab, video, note or RSS feed</p>
                                </div>
                            </Command.Item>

                            <Command.Item
                                onSelect={() => { onGroupTabs(); close(); }}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm hover:bg-muted/60 aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                            >
                                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Layers className="h-4 w-4 text-blue-500" />
                                </div>
                                <div>
                                    <p className="font-medium">Group tabs by folder</p>
                                    <p className="text-xs text-muted-foreground">Brave-style auto-grouping in browser</p>
                                </div>
                            </Command.Item>

                            <Command.Item
                                onSelect={() => { onAddRss(); close(); }}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm hover:bg-muted/60 aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                            >
                                <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                    <Rss className="h-4 w-4 text-orange-500" />
                                </div>
                                <div>
                                    <p className="font-medium">Add RSS feed</p>
                                    <p className="text-xs text-muted-foreground">Subscribe to a new RSS or Atom feed</p>
                                </div>
                            </Command.Item>
                        </Command.Group>

                        {/* Workspace switching */}
                        {filteredWorkspaces.length > 0 && (
                            <Command.Group heading={<span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mt-2 block">Workspaces</span>}>
                                {filteredWorkspaces.map(ws => (
                                    <Command.Item
                                        key={ws.id}
                                        onSelect={() => { onSwitchWorkspace(ws.id); close(); }}
                                        className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer text-sm hover:bg-muted/60 aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                                    >
                                        <div className="w-6 h-6 rounded-md flex-shrink-0" style={{ backgroundColor: ws.color || '#6366f1' }} />
                                        <span>{ws.icon} {ws.name}</span>
                                        {ws.id === currentWorkspaceId && (
                                            <span className="ml-auto text-[10px] text-muted-foreground">current</span>
                                        )}
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}

                        {/* Folder navigation */}
                        {filteredFolders.length > 0 && (
                            <Command.Group heading={<span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mt-2 block">Folders</span>}>
                                {filteredFolders.map(folder => (
                                    <Command.Item
                                        key={folder.id}
                                        className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer text-sm hover:bg-muted/60 aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                                    >
                                        <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <span>{folder.icon} {folder.name}</span>
                                        {folder.unreadCount > 0 && (
                                            <span className="ml-auto text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                                                {folder.unreadCount}
                                            </span>
                                        )}
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}

                        {/* Item search results */}
                        {filteredItems.length > 0 && (
                            <Command.Group heading={<span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mt-2 block">Items</span>}>
                                {filteredItems.map(item => (
                                    <Command.Item
                                        key={item.id}
                                        onSelect={() => { onOpenItem(item); close(); }}
                                        className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer text-sm hover:bg-muted/60 aria-selected:bg-primary/10 aria-selected:text-primary transition-colors"
                                    >
                                        {item.favicon ? (
                                            <img src={item.favicon} className="w-5 h-5 rounded flex-shrink-0" alt="" />
                                        ) : (
                                            <span className="text-base flex-shrink-0">{TYPE_ICONS[item.type] || '🔗'}</span>
                                        )}
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">{item.title}</p>
                                            <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                                        </div>
                                        {item.status === 'hibernated' && (
                                            <MoonStar className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 ml-auto" />
                                        )}
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}

                        {query && filteredItems.length === 0 && filteredWorkspaces.length === 0 && (
                            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                                No results for "{query}"
                            </Command.Empty>
                        )}
                    </Command.List>

                    <div className="px-4 py-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                        <div className="flex gap-3">
                            <span>↑↓ navigate</span>
                            <span>↵ select</span>
                            <span>esc close</span>
                        </div>
                        <span>Ctrl+Shift+K</span>
                    </div>
                </Command>
            </div>
        </div>
    );
}
