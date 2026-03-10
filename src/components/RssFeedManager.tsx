import { useState } from 'react';
import { Plus, Trash2, RefreshCw, Rss, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { RssFeed, Folder as FolderType } from '../types';

// ============================================================
// RssFeedManager – add, manage, delete RSS feeds
// ============================================================

interface RssFeedManagerProps {
    feeds: RssFeed[];
    folders: FolderType[];
    onAdd: (feed: Pick<RssFeed, 'url' | 'name' | 'folder_id' | 'fetch_interval_minutes'>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onRefresh: (id: string) => Promise<void>;
}

const INTERVAL_OPTIONS = [
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '4 hours', value: 240 },
    { label: '12 hours', value: 720 },
    { label: '24 hours', value: 1440 },
];

export function RssFeedManager({ feeds, folders, onAdd, onDelete, onRefresh }: RssFeedManagerProps) {
    const [url, setUrl] = useState('');
    const [name, setName] = useState('');
    const [folderId, setFolderId] = useState('');
    const [interval, setInterval] = useState(60);
    const [adding, setAdding] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;

        setAdding(true);
        try {
            await onAdd({
                url: url.trim(),
                name: name.trim() || new URL(url).hostname,
                folder_id: folderId || undefined,
                fetch_interval_minutes: interval,
            });
            setUrl('');
            setName('');
            setFolderId('');
            setInterval(60);
            setShowForm(false);
        } catch (err) {
            console.error('Failed to add feed:', err);
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Rss className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">RSS Feeds</h3>
                    <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{feeds.length}</span>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs h-7"
                    onClick={() => setShowForm(v => !v)}
                >
                    <Plus className="h-3 w-3" />
                    Add Feed
                </Button>
            </div>

            {/* Add Form */}
            {showForm && (
                <form onSubmit={handleAdd} className="p-4 rounded-xl border border-border/50 bg-muted/30 space-y-3">
                    <Input
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="https://example.com/feed.rss"
                        required
                        type="url"
                        className="text-sm h-8"
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Feed name (optional)"
                            className="text-sm h-8"
                        />
                        <Select value={folderId} onValueChange={setFolderId}>
                            <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="No folder" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">No folder</SelectItem>
                                {folders.map(f => (
                                    <SelectItem key={f.id} value={f.id}>
                                        {f.icon || '📁'} {f.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={String(interval)} onValueChange={v => setInterval(Number(v))}>
                            <SelectTrigger className="h-8 text-sm flex-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {INTERVAL_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button type="submit" size="sm" className="h-8 text-xs" disabled={adding}>
                            {adding ? 'Adding…' : 'Subscribe'}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowForm(false)}>
                            Cancel
                        </Button>
                    </div>
                </form>
            )}

            {/* Feed list */}
            {feeds.length === 0 && !showForm && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                    <Rss className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No RSS feeds yet</p>
                </div>
            )}

            <div className="space-y-2">
                {feeds.map(feed => {
                    const folder = folders.find(f => f.id === feed.folder_id);
                    const lastFetched = feed.last_fetched
                        ? new Date(feed.last_fetched).toLocaleString()
                        : 'Never';

                    return (
                        <div
                            key={feed.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card hover:border-border transition-colors group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                                <Rss className="h-4 w-4 text-orange-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{feed.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{feed.url}</p>
                                <div className="flex items-center gap-3 mt-0.5">
                                    {folder && (
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Folder className="h-2.5 w-2.5" />
                                            {folder.name}
                                        </span>
                                    )}
                                    <span className="text-[10px] text-muted-foreground">
                                        Every {feed.fetch_interval_minutes}m · Last: {lastFetched}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => onRefresh(feed.id)}
                                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    title="Refresh now"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => onDelete(feed.id)}
                                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Delete feed"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
