import { useState } from 'react';
import {
  LayoutGrid, List, Moon, Globe, Rss, BookOpen, Search,
  Trash2, ExternalLink, Plus, Archive, RefreshCw, Layers,
  MoonStar, Settings, ChevronRight, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FolderTree } from '@/components/FolderTree';
import { WorkspaceSelector } from '@/components/WorkspaceSelector';
import { MediaGrid } from '@/components/MediaGrid';
import { FuzzySearch } from '@/components/FuzzySearch';
import { RssFeedManager } from '@/components/RssFeedManager';
import { CommandPalette } from '@/components/CommandPalette';
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import type { Item } from '@/types';

// ============================================================
// Full-page Dashboard – 3-column layout
// ============================================================

type ViewMode = 'list' | 'grid';
type FilterStatus = 'all' | 'unread' | 'read' | 'hibernated' | 'archived';
type PanelTab = 'folders' | 'rss' | 'settings';

const TYPE_ICONS: Record<string, string> = {
  Tab: '🌐', Video: '🎬', RSS_Feed: '📡', Note: '📝',
};

const STATUS_COLORS: Record<string, string> = {
  unread: 'text-blue-500', read: 'text-green-500',
  hibernated: 'text-purple-500', archived: 'text-zinc-400',
};

export default function Dashboard() {
  const data = useWorkspaceData();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [panelTab, setPanelTab] = useState<PanelTab>('folders');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addUrl, setAddUrl] = useState('');
  const [addFolder, setAddFolder] = useState('');
  const [addingUrl, setAddingUrl] = useState(false);
  const [newFolderDialog, setNewFolderDialog] = useState<{ parentId: string | null } | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (data.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  // Filter items
  const displayItems = data.filteredItems.filter(item => {
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesSearch = !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const videoItems = displayItems.filter(i => i.type === 'Video');
  const isVideoFolder = videoItems.length > 0 && videoItems.length / displayItems.length > 0.5;

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUrl.trim()) return;
    setAddingUrl(true);
    try {
      await data.addItem(addUrl.trim(), undefined, addFolder || undefined);
      setAddUrl('');
      setAddFolder('');
      setAddDialogOpen(false);
    } finally {
      setAddingUrl(false);
    }
  };

  const handleGroupTabs = async () => {
    if (typeof chrome !== 'undefined') {
      chrome.runtime.sendMessage({ action: 'groupTabsByFolder' });
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* ── Top Bar ── */}
      <header className="flex-shrink-0 h-14 border-b border-border/50 flex items-center px-4 gap-4 bg-card/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <MoonStar className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold text-sm">Clear Tab Mind</span>
        </div>

        <div className="flex-1 max-w-md">
          <FuzzySearch
            items={data.items}
            onSelect={item => data.openItem(item)}
            placeholder="Search items… (Ctrl+Shift+K for commands)"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setCommandOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg hover:bg-muted transition-colors"
          >
            <Search className="h-3 w-3" />
            <span>Commands</span>
            <kbd className="ml-1 px-1 py-0.5 rounded bg-background border border-border font-mono text-[10px]">⌃⇧K</kbd>
          </button>

          <Button size="sm" onClick={() => setAddDialogOpen(true)} className="gap-1.5 text-xs h-8">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ── Left Sidebar ── */}
        <aside className="flex-shrink-0 w-60 border-r border-border/50 flex flex-col bg-card/30 overflow-hidden">
          {/* Workspace selector */}
          <div className="p-3 border-b border-border/50">
            <WorkspaceSelector
              workspaces={data.workspaces}
              activeWorkspace={data.activeWorkspace}
              onSwitch={data.switchWorkspace}
              onAddWorkspace={data.addWorkspace}
            />
          </div>

          {/* Panel tabs */}
          <div className="flex border-b border-border/50">
            {([['folders', '📁'], ['rss', '📡'], ['settings', '⚙️']] as [PanelTab, string][]).map(([tab, icon]) => (
              <button
                key={tab}
                onClick={() => setPanelTab(tab)}
                className={`flex-1 py-2 text-xs font-medium transition-colors capitalize
                  ${panelTab === tab ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-3">
            {panelTab === 'folders' && (
              <FolderTree
                folders={data.folders}
                selectedFolderId={data.selectedFolderId}
                onSelectFolder={data.setSelectedFolderId}
                onAddFolder={parentId => { setNewFolderDialog({ parentId }); setNewFolderName(''); }}
                onRenameFolder={data.renameFolder}
                onDeleteFolder={data.deleteFolder}
              />
            )}

            {panelTab === 'rss' && (
              <RssFeedManager
                feeds={data.rssFeeds}
                folders={data.flatFolders}
                onAdd={data.addRssFeed}
                onDelete={data.deleteRssFeed}
                onRefresh={data.refreshRssFeed}
              />
            )}

            {panelTab === 'settings' && (
              <div className="space-y-3 text-sm">
                <div className="p-3 rounded-xl bg-muted/40 space-y-2">
                  <p className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Actions</p>
                  <button
                    onClick={handleGroupTabs}
                    className="w-full flex items-center gap-2 py-2 text-sm hover:text-primary transition-colors"
                  >
                    <Layers className="h-4 w-4" /> Group tabs by folder
                  </button>
                  <button
                    onClick={async () => {
                      const n = await data.cleanupDuplicates();
                      alert(`Removed ${n} duplicate items`);
                    }}
                    className="w-full flex items-center gap-2 py-2 text-sm hover:text-primary transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" /> Clean up duplicates
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 space-y-1">
                  <p className="font-medium text-xs text-muted-foreground uppercase tracking-wider mb-2">Stats</p>
                  <p className="text-xs text-muted-foreground">Total items: <b className="text-foreground">{data.items.length}</b></p>
                  <p className="text-xs text-muted-foreground">Unread: <b className="text-blue-500">{data.items.filter(i => i.status === 'unread').length}</b></p>
                  <p className="text-xs text-muted-foreground">Hibernated: <b className="text-purple-500">{data.items.filter(i => i.status === 'hibernated').length}</b></p>
                  <p className="text-xs text-muted-foreground">Videos: <b className="text-foreground">{data.items.filter(i => i.type === 'Video').length}</b></p>
                  <p className="text-xs text-muted-foreground">RSS items: <b className="text-foreground">{data.items.filter(i => i.type === 'RSS_Feed').length}</b></p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Content toolbar */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border/50 bg-card/20">
            <h2 className="font-semibold text-sm">
              {data.selectedFolderId
                ? (data.flatFolders.find(f => f.id === data.selectedFolderId)?.name || 'Folder')
                : 'All Items'}
              <span className="ml-2 text-xs text-muted-foreground font-normal">{displayItems.length}</span>
            </h2>

            {/* Status filter */}
            <div className="flex gap-1 ml-2">
              {(['all', 'unread', 'read', 'hibernated', 'archived'] as FilterStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors capitalize
                    ${filterStatus === s ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                >
                  {s === 'hibernated' ? '💤' : s === 'unread' ? '🔵' : ''} {s}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="ml-auto flex items-center gap-1 bg-muted/40 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {displayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <span className="text-5xl mb-4">📭</span>
                <p className="font-medium">Nothing here yet</p>
                <p className="text-sm mt-1">Add items from the browser or use the + button</p>
              </div>
            ) : (viewMode === 'grid' || isVideoFolder) && data.selectedFolderId !== null ? (
              <MediaGrid
                items={displayItems}
                onOpen={data.openItem}
                onDelete={data.deleteItem}
              />
            ) : (
              <div className="space-y-1">
                {displayItems.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onOpen={() => data.openItem(item)}
                    onDelete={() => data.deleteItem(item.id)}
                    onArchive={() => data.updateItem(item.id, { status: 'archived' })}
                    onMarkRead={() => data.updateItem(item.id, { status: 'read' })}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Modals ── */}

      {/* Add Item Dialog */}
      {addDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl border border-border p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-base mb-4">Add Item</h3>
            <form onSubmit={handleAddItem} className="space-y-3">
              <input
                autoFocus
                type="url"
                value={addUrl}
                onChange={e => setAddUrl(e.target.value)}
                placeholder="https://..."
                required
                className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm outline-none focus:ring-2 focus:ring-primary/50"
              />
              <select
                value={addFolder}
                onChange={e => setAddFolder(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm outline-none"
              >
                <option value="">No folder</option>
                {data.flatFolders.map(f => (
                  <option key={f.id} value={f.id}>{f.icon || '📁'} {f.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={addingUrl}>
                  {addingUrl ? 'Saving…' : 'Save Item'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                YouTube/Vimeo thumbnails + metadata fetched automatically
              </p>
            </form>
          </div>
        </div>
      )}

      {/* New folder dialog */}
      {newFolderDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl border border-border p-6 w-80 mx-4">
            <h3 className="font-bold text-sm mb-3">New Folder</h3>
            <form onSubmit={async e => {
              e.preventDefault();
              if (!newFolderName.trim()) return;
              await data.addFolder(newFolderName.trim(), newFolderDialog.parentId);
              setNewFolderDialog(null);
            }} className="space-y-3">
              <input
                autoFocus
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                required
                className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm outline-none focus:ring-2 focus:ring-primary/50"
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="flex-1">Create</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setNewFolderDialog(null)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Command Palette */}
      <CommandPalette
        items={data.items}
        workspaces={data.workspaces}
        folders={data.folders}
        currentWorkspaceId={data.activeWorkspace?.id}
        onOpenItem={data.openItem}
        onSwitchWorkspace={data.switchWorkspace}
        onAddRss={() => setPanelTab('rss')}
        onGroupTabs={handleGroupTabs}
        onAddItem={() => setAddDialogOpen(true)}
      />
    </div>
  );
}

// ── Item row component ─────────────────────────────────────
function ItemRow({ item, onOpen, onDelete, onArchive, onMarkRead }: {
  item: Item;
  onOpen: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onMarkRead: () => void;
}) {
  const isHibernated = item.status === 'hibernated';
  return (
    <div className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer ${isHibernated ? 'opacity-75' : ''}`}
      onClick={onOpen}
    >
      {/* Favicon / type icon */}
      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
        {item.favicon ? (
          <img src={item.favicon} className="w-5 h-5 rounded" alt="" loading="lazy" />
        ) : (
          <span className="text-base">{TYPE_ICONS[item.type] || '🔗'}</span>
        )}
      </div>

      {/* Title + URL */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${item.status === 'read' ? 'text-muted-foreground' : 'text-foreground'}`}>
          {isHibernated && <MoonStar className="inline h-3 w-3 mr-1 text-purple-400" />}
          {item.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">{item.url}</p>
      </div>

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="hidden sm:flex gap-1 flex-shrink-0">
          {item.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{tag}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={onOpen} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Open">
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
        {item.status !== 'read' && (
          <button onClick={onMarkRead} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-green-500 transition-colors" title="Mark read">
            <Globe className="h-3.5 w-3.5" />
          </button>
        )}
        <button onClick={onArchive} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Archive">
          <Archive className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
