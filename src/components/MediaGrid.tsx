import { Play, Clock, Eye } from 'lucide-react';
import type { Item } from '../types';

// ============================================================
// MediaGrid – thumbnail-first grid view for Video-type items
// ============================================================

interface MediaGridProps {
    items: Item[];
    onOpen: (item: Item) => void;
    onDelete?: (id: string) => void;
}

function formatDuration(seconds?: number): string {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m >= 60
        ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`;
}

const PLATFORM_COLORS: Record<string, string> = {
    youtube: 'bg-red-600',
    vimeo: 'bg-blue-500',
    other: 'bg-zinc-600',
};

export function MediaGrid({ items, onOpen, onDelete }: MediaGridProps) {
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <span className="text-4xl mb-3">🎬</span>
                <p className="text-sm">No videos saved yet</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map(item => {
                const meta = item.metadata as { duration?: number; platform?: string; channelName?: string } | undefined;
                const duration = meta?.duration;
                const platform = meta?.platform || 'other';
                const channelName = meta?.channelName;
                const isWatched = item.status === 'read';

                return (
                    <article
                        key={item.id}
                        className={`group relative rounded-xl overflow-hidden bg-card border border-border/50 hover:border-primary/40 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${isWatched ? 'opacity-60' : ''}`}
                        onClick={() => onOpen(item)}
                    >
                        {/* Thumbnail */}
                        <div className="relative aspect-video bg-muted overflow-hidden">
                            {item.thumbnail_url ? (
                                <img
                                    src={item.thumbnail_url}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Play className="h-8 w-8 text-muted-foreground/40" />
                                </div>
                            )}

                            {/* Platform badge */}
                            <span className={`absolute top-2 left-2 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md ${PLATFORM_COLORS[platform] || PLATFORM_COLORS.other}`}>
                                {platform.toUpperCase()}
                            </span>

                            {/* Duration badge */}
                            {duration !== undefined && (
                                <span className="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] font-mono px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5" />
                                    {formatDuration(duration)}
                                </span>
                            )}

                            {/* Watched overlay */}
                            {isWatched && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Eye className="h-6 w-6 text-white/80" />
                                </div>
                            )}

                            {/* Hover play button */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="bg-primary/90 rounded-full p-3 shadow-lg">
                                    <Play className="h-5 w-5 text-primary-foreground fill-current" />
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="p-3">
                            <h3 className="text-xs font-semibold leading-tight line-clamp-2 text-foreground mb-1">
                                {item.title}
                            </h3>
                            {channelName && (
                                <p className="text-xs text-muted-foreground truncate">{channelName}</p>
                            )}
                            {/* Tags */}
                            {item.tags.length > 0 && (
                                <div className="flex gap-1 mt-2 flex-wrap">
                                    {item.tags.slice(0, 2).map(tag => (
                                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Delete button */}
                        {onDelete && (
                            <button
                                onClick={e => { e.stopPropagation(); onDelete(item.id); }}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/60 hover:bg-destructive text-white rounded-full p-1 transition-all"
                                title="Remove"
                            >
                                <span className="text-xs">✕</span>
                            </button>
                        )}
                    </article>
                );
            })}
        </div>
    );
}
