import { useState } from 'react';
import { ChevronDown, Plus, Palette } from 'lucide-react';
import type { Workspace } from '../types';

// ============================================================
// WorkspaceSelector – dropdown to switch/manage workspaces
// ============================================================

interface WorkspaceSelectorProps {
    workspaces: Workspace[];
    activeWorkspace?: Workspace;
    onSwitch: (id: string) => void;
    onAddWorkspace: (name: string, color: string) => void;
}

const WORKSPACE_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#eab308',
    '#22c55e', '#06b6d4', '#3b82f6', '#ef4444', '#64748b',
];

export function WorkspaceSelector({ workspaces, activeWorkspace, onSwitch, onAddWorkspace }: WorkspaceSelectorProps) {
    const [open, setOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState(WORKSPACE_COLORS[0]);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        onAddWorkspace(newName.trim(), newColor);
        setNewName('');
        setNewColor(WORKSPACE_COLORS[0]);
        setCreating(false);
        setOpen(false);
    };

    return (
        <div className="relative">
            {/* Trigger */}
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-sm font-medium"
            >
                <div
                    className="w-5 h-5 rounded-md flex-shrink-0"
                    style={{ backgroundColor: activeWorkspace?.color || '#6366f1' }}
                />
                <span className="flex-1 text-left truncate">
                    {activeWorkspace?.icon} {activeWorkspace?.name || 'Select workspace'}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl bg-popover shadow-xl border border-border overflow-hidden">
                    {workspaces.map(ws => (
                        <button
                            key={ws.id}
                            onClick={() => { onSwitch(ws.id); setOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted
                ${ws.id === activeWorkspace?.id ? 'bg-primary/10 text-primary' : 'text-foreground'}`}
                        >
                            <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{ backgroundColor: ws.color || '#6366f1' }} />
                            <span className="flex-1 text-left">{ws.icon} {ws.name}</span>
                            {ws.id === activeWorkspace?.id && (
                                <span className="text-[10px] text-primary font-medium">Active</span>
                            )}
                        </button>
                    ))}

                    {/* Create new */}
                    {creating ? (
                        <form onSubmit={handleCreate} className="p-3 border-t border-border/50 space-y-2">
                            <input
                                autoFocus
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Workspace name…"
                                className="w-full text-sm px-2 py-1.5 rounded-lg bg-muted border border-border outline-none focus:ring-1 focus:ring-primary"
                            />
                            <div className="flex items-center gap-2">
                                <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                                <div className="flex gap-1 flex-wrap">
                                    {WORKSPACE_COLORS.map(c => (
                                        <button
                                            type="button"
                                            key={c}
                                            onClick={() => setNewColor(c)}
                                            className={`w-4 h-4 rounded-full transition-transform ${newColor === c ? 'ring-2 ring-offset-1 ring-white scale-110' : ''}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" className="flex-1 text-xs py-1 bg-primary text-primary-foreground rounded-lg">Create</button>
                                <button type="button" onClick={() => setCreating(false)} className="flex-1 text-xs py-1 bg-muted rounded-lg">Cancel</button>
                            </div>
                        </form>
                    ) : (
                        <button
                            onClick={() => setCreating(true)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors border-t border-border/50"
                        >
                            <Plus className="h-4 w-4" />
                            New workspace
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
