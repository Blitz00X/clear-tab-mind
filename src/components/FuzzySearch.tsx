import React, { useState, useCallback, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import { Search, X } from 'lucide-react';
import type { Item } from '../types';

// ============================================================
// FuzzySearch – powered by Fuse.js, searches across all items
// ============================================================

interface FuzzySearchProps {
    items: Item[];
    onSelect?: (item: Item) => void;
    placeholder?: string;
    className?: string;
}

const FUSE_OPTIONS = {
    keys: [
        { name: 'title', weight: 0.4 },
        { name: 'url', weight: 0.2 },
        { name: 'tags', weight: 0.3 },
        { name: 'note', weight: 0.1 },
    ],
    threshold: 0.35,         // 0 = exact, 1 = match anything
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2,
    shouldSort: true,
};

const TYPE_ICONS: Record<string, string> = {
    Tab: '🌐',
    Video: '🎬',
    RSS_Feed: '📡',
    Note: '📝',
};

export function FuzzySearch({ items, onSelect, placeholder = 'Search titles, URLs, tags…', className = '' }: FuzzySearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Fuse.FuseResult<Item>[]>([]);
    const [focused, setFocused] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const fuseRef = useRef<Fuse<Item> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Rebuild fuse index when items change
    useEffect(() => {
        fuseRef.current = new Fuse(items, FUSE_OPTIONS);
    }, [items]);

    const handleSearch = useCallback((q: string) => {
        setQuery(q);
        setActiveIndex(0);
        if (!q.trim() || !fuseRef.current) {
            setResults([]);
            return;
        }
        const found = fuseRef.current.search(q).slice(0, 12);
        setResults(found);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && results[activeIndex]) {
            onSelect?.(results[activeIndex].item);
            setQuery('');
            setResults([]);
        } else if (e.key === 'Escape') {
            setQuery('');
            setResults([]);
            inputRef.current?.blur();
        }
    };

    const clear = () => {
        setQuery('');
        setResults([]);
        inputRef.current?.focus();
    };

    return (
        <div className={`relative ${className}`}>
            {/* Input */}
            <div className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => handleSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setTimeout(() => setFocused(false), 150)}
                    placeholder={placeholder}
                    className="w-full pl-9 pr-8 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                {query && (
                    <button
                        onClick={clear}
                        className="absolute right-2 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
            </div>

            {/* Results dropdown */}
            {focused && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card/95 backdrop-blur border border-border rounded-xl shadow-xl overflow-hidden">
                    <div className="max-h-80 overflow-y-auto">
                        {results.map((result, idx) => (
                            <button
                                key={result.item.id}
                                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${idx === activeIndex ? 'bg-primary/10' : ''}`}
                                onClick={() => {
                                    onSelect?.(result.item);
                                    setQuery('');
                                    setResults([]);
                                }}
                            >
                                <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICONS[result.item.type] || '🔗'}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{result.item.title}</p>
                                    <p className="text-xs text-muted-foreground truncate">{result.item.url}</p>
                                    {result.item.tags.length > 0 && (
                                        <div className="flex gap-1 mt-1 flex-wrap">
                                            {result.item.tags.slice(0, 3).map(tag => (
                                                <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {result.score !== undefined && (
                                    <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
                                        {Math.round((1 - result.score) * 100)}%
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="px-4 py-2 border-t border-border/50 text-xs text-muted-foreground flex gap-3">
                        <span>↑↓ navigate</span>
                        <span>↵ open</span>
                        <span>esc close</span>
                    </div>
                </div>
            )}
        </div>
    );
}
