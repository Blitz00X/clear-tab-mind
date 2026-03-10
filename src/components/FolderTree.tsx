import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, MoreHorizontal, Trash2, Edit2 } from 'lucide-react';
import type { FolderWithChildren } from '../types';

// ============================================================
// FolderTree – recursive nested folder tree
// ============================================================

interface FolderTreeProps {
    folders: FolderWithChildren[];
    selectedFolderId?: string | null;
    onSelectFolder: (id: string | null) => void;
    onAddFolder?: (parentId: string | null) => void;
    onRenameFolder?: (id: string, name: string) => void;
    onDeleteFolder?: (id: string) => void;
}

interface FolderNodeProps {
    folder: FolderWithChildren;
    depth: number;
    selectedFolderId?: string | null;
    onSelectFolder: (id: string | null) => void;
    onAddFolder?: (parentId: string | null) => void;
    onRenameFolder?: (id: string, name: string) => void;
    onDeleteFolder?: (id: string) => void;
}

function FolderNode({ folder, depth, selectedFolderId, onSelectFolder, onAddFolder, onRenameFolder, onDeleteFolder }: FolderNodeProps) {
    const [open, setOpen] = useState(depth === 0);
    const [menuOpen, setMenuOpen] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const [renamingValue, setRenamingValue] = useState(folder.name);

    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder.children.length > 0;

    const handleRename = useCallback(() => {
        if (renamingValue.trim() && renamingValue !== folder.name) {
            onRenameFolder?.(folder.id, renamingValue.trim());
        }
        setRenaming(false);
    }, [renamingValue, folder.id, folder.name, onRenameFolder]);

    return (
        <div>
            <div
                className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer select-none transition-colors
          ${isSelected ? 'bg-primary/15 text-primary' : 'hover:bg-muted/60 text-foreground'}`}
                style={{ paddingLeft: `${8 + depth * 16}px` }}
                onClick={() => onSelectFolder(folder.id)}
            >
                {/* Expand toggle */}
                <button
                    onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
                    className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground"
                >
                    {hasChildren ? (
                        open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                    ) : (
                        <span className="w-3" />
                    )}
                </button>

                {/* Icon */}
                <span className="flex-shrink-0 text-sm">
                    {folder.icon || (open ? '📂' : '📁')}
                </span>

                {/* Name or rename input */}
                {renaming ? (
                    <input
                        autoFocus
                        value={renamingValue}
                        onChange={e => setRenamingValue(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 text-sm bg-transparent border-b border-primary outline-none px-0"
                    />
                ) : (
                    <span className="flex-1 text-sm font-medium truncate">{folder.name}</span>
                )}

                {/* Counts */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    {folder.unreadCount > 0 && (
                        <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                            {folder.unreadCount}
                        </span>
                    )}
                </div>

                {/* Context menu trigger */}
                <div className="relative">
                    <button
                        onClick={e => { e.stopPropagation(); setMenuOpen(m => !m); }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted transition-all"
                    >
                        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>

                    {menuOpen && (
                        <div
                            className="absolute right-0 top-full mt-1 z-50 w-40 rounded-xl bg-popover shadow-xl border border-border overflow-hidden"
                            onMouseLeave={() => setMenuOpen(false)}
                        >
                            <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors"
                                onClick={e => { e.stopPropagation(); setMenuOpen(false); onAddFolder?.(folder.id); }}
                            >
                                <Plus className="h-3 w-3" /> Add subfolder
                            </button>
                            <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors"
                                onClick={e => { e.stopPropagation(); setMenuOpen(false); setRenaming(true); }}
                            >
                                <Edit2 className="h-3 w-3" /> Rename
                            </button>
                            <button
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                                onClick={e => { e.stopPropagation(); setMenuOpen(false); onDeleteFolder?.(folder.id); }}
                            >
                                <Trash2 className="h-3 w-3" /> Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Children */}
            {open && hasChildren && (
                <div className="overflow-hidden">
                    {folder.children.map(child => (
                        <FolderNode
                            key={child.id}
                            folder={child}
                            depth={depth + 1}
                            selectedFolderId={selectedFolderId}
                            onSelectFolder={onSelectFolder}
                            onAddFolder={onAddFolder}
                            onRenameFolder={onRenameFolder}
                            onDeleteFolder={onDeleteFolder}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function FolderTree({ folders, selectedFolderId, onSelectFolder, onAddFolder, onRenameFolder, onDeleteFolder }: FolderTreeProps) {
    return (
        <div className="space-y-0.5">
            {/* All items */}
            <button
                onClick={() => onSelectFolder(null)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
          ${selectedFolderId === null ? 'bg-primary/15 text-primary' : 'hover:bg-muted/60 text-foreground'}`}
            >
                <Folder className="h-4 w-4" />
                All Items
            </button>

            {folders.map(folder => (
                <FolderNode
                    key={folder.id}
                    folder={folder}
                    depth={0}
                    selectedFolderId={selectedFolderId}
                    onSelectFolder={onSelectFolder}
                    onAddFolder={onAddFolder}
                    onRenameFolder={onRenameFolder}
                    onDeleteFolder={onDeleteFolder}
                />
            ))}

            {/* Add root folder */}
            {onAddFolder && (
                <button
                    onClick={() => onAddFolder(null)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors mt-1"
                >
                    <Plus className="h-3.5 w-3.5" />
                    New folder
                </button>
            )}
        </div>
    );
}
