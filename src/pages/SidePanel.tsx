import { useState } from 'react';
import { MoonStar, Plus, ExternalLink, Layers, ChevronRight, Globe, Rss, Sparkles } from 'lucide-react';
import { FolderTree } from '@/components/FolderTree';
import { WorkspaceSelector } from '@/components/WorkspaceSelector';
import { FuzzySearch } from '@/components/FuzzySearch';
import { CommandPalette } from '@/components/CommandPalette';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import type { Item } from '@/types';

// ============================================================
// SidePanel – Chrome Side Panel compact view
// ============================================================

const TYPE_ICONS: Record<string, string> = {
    Tab: '🌐', Video: '🎬', RSS_Feed: '📡', Note: '📝',
};

export default function SidePanel() {
    const data = useWorkspaceData();
    const [addUrl, setAddUrl] = useState('');
    const [adding, setAdding] = useState(false);

    if (data.loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            </div>
        );
    }

    const recentUnread = data.items.filter(i => i.status === 'unread').slice(0, 20);
    const hibernated = data.items.filter(i => i.status === 'hibernated').slice(0, 10);

    const handleQuickAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addUrl.trim()) return;
        setAdding(true);
        try {
            await data.addItem(addUrl.trim(), undefined, data.selectedFolderId || undefined);
            setAddUrl('');
        } finally {
            setAdding(false);
        }
    };

    const openDashboard = () => {
        if (typeof chrome !== 'undefined') {
            chrome.runtime.sendMessage({ action: 'openDashboard' });
        } else {
            window.open('/index.html', '_blank');
        }
    };

    return (
        <div className="h-screen bg-background flex flex-col text-sm overflow-hidden">
            {/* Header */}
            <header className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-border/50 bg-card/50">
                <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                    <MoonStar className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="font-bold text-sm flex-1">Clear Tab Mind</span>
                <button
                    onClick={openDashboard}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Open full dashboard"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                </button>
            </header>

            {/* Workspace selector */}
            <div className="flex-shrink-0 px-3 py-2 border-b border-border/50">
                <WorkspaceSelector
                    workspaces={data.workspaces}
                    activeWorkspace={data.activeWorkspace}
                    onSwitch={data.switchWorkspace}
                    onAddWorkspace={data.addWorkspace}
                />
            </div>

            {/* Quick add */}
            <div className="flex-shrink-0 px-3 py-2 border-b border-border/50">
                <form onSubmit={handleQuickAdd} className="flex gap-1.5">
                    <input
                        type="url"
                        value={addUrl}
                        onChange={e => setAddUrl(e.target.value)}
                        placeholder="Quick save URL…"
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <button
                        type="submit"
                        disabled={adding || !addUrl.trim()}
                        className="px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 transition-opacity"
                    >
                        {adding ? '…' : <Plus className="h-3.5 w-3.5" />}
                    </button>
                </form>
            </div>

            {/* Search */}
            <div className="flex-shrink-0 px-3 py-2 border-b border-border/50">
                <FuzzySearch
                    items={data.items}
                    onSelect={data.openItem}
                    placeholder="Search…"
                    className="w-full"
                />
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Folder tree – collapsible */}
                <details className="flex-shrink-0 border-b border-border/50">
                    <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer list-none hover:bg-muted/30 transition-colors">
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Folders</span>
                    </summary>
                    <div className="px-2 py-1 max-h-48 overflow-y-auto">
                        <FolderTree
                            folders={data.folders}
                            selectedFolderId={data.selectedFolderId}
                            onSelectFolder={data.setSelectedFolderId}
                            onAddFolder={parentId => data.addFolder('New Folder', parentId)}
                            onRenameFolder={data.renameFolder}
                            onDeleteFolder={data.deleteFolder}
                        />
                    </div>
                </details>

                {/* Hibernated tabs */}
                {hibernated.length > 0 && (
                    <details className="flex-shrink-0 border-b border-border/50">
                        <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer list-none hover:bg-muted/30 transition-colors">
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            <MoonStar className="h-3 w-3 text-purple-400" />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hibernated</span>
                            <span className="ml-auto text-[10px] bg-purple-500/15 text-purple-400 rounded-full px-1.5">{hibernated.length}</span>
                        </summary>
                        <div className="max-h-32 overflow-y-auto">
                            {hibernated.map(item => (
                                <SidePanelRow key={item.id} item={item} onOpen={() => data.openItem(item)} />
                            ))}
                        </div>
                    </details>
                )}

                {/* Unread items */}
                <div className="flex-1 overflow-y-auto">
                    <div className="px-3 py-2 flex items-center gap-2 border-b border-border/30">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unread</span>
                        <span className="ml-auto text-[10px] bg-blue-500/15 text-blue-400 rounded-full px-1.5">{recentUnread.length}</span>
                    </div>

                    {recentUnread.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                            <span className="text-2xl block mb-2">✨</span>
                            All caught up!
                        </div>
                    ) : (
                        recentUnread.map(item => (
                            <SidePanelRow key={item.id} item={item} onOpen={() => data.openItem(item)} />
                        ))
                    )}
                </div>
            </div>

            {/* Command Palette */}
            <CommandPalette
                items={data.items}
                workspaces={data.workspaces}
                folders={data.folders}
                currentWorkspaceId={data.activeWorkspace?.id}
                onOpenItem={data.openItem}
                onSwitchWorkspace={data.switchWorkspace}
                onAddRss={openDashboard}
                onGroupTabs={() => chrome?.runtime?.sendMessage({ action: 'groupTabsByFolder' })}
                onAddItem={() => { }}
            />
        </div>
    );
}

function SidePanelRow({ item, onOpen }: { item: Item; onOpen: () => void }) {
    return (
        <div
            onClick={onOpen}
            className="group flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors cursor-pointer"
        >
            {item.favicon ? (
                <img src={item.favicon} className="w-4 h-4 rounded flex-shrink-0" alt="" loading="lazy" />
            ) : (
                <span className="text-xs flex-shrink-0">{TYPE_ICONS[item.type] || '🔗'}</span>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{new URL(item.url).hostname}</p>
            </div>
        </div>
    );
}
