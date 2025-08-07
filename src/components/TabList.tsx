import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

export interface TabItem {
  id: string;
  title: string;
  url: string;
  tags: string[];
  status: 'unread' | 'read' | 'archived';
}

interface TabListProps {
  tabs: TabItem[];
  onOpen: (url: string) => void;
  onDelete: (id: string) => void;
  emptyMessage?: string;
}

export function TabList({ tabs, onOpen, onDelete, emptyMessage }: TabListProps) {
  return (
    <div className="max-h-96 overflow-y-auto text-xs border rounded divide-y">
      {tabs.map((tab) => (
        <div key={tab.id} className="flex items-center gap-2 py-1.5 px-2 hover:bg-muted">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Favicon url={tab.url} />
            <span className="truncate max-w-[200px]">{tab.title || new URL(tab.url).hostname}</span>
            <span className="truncate max-w-[180px] text-muted-foreground">
              {truncateUrl(tab.url)}
            </span>
            <div className="flex items-center gap-1">
              {tab.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-[10px] rounded-full">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span>{tab.status === 'read' ? '✔️' : ''}</span>
            <button
              aria-label="Open tab"
              onClick={() => onOpen(tab.url)}
              className="hover:text-primary"
            >
              🔗
            </button>
            <button
              aria-label="Delete tab"
              onClick={() => onDelete(tab.id)}
              className="hover:text-destructive"
            >
              ❌
            </button>
          </div>
        </div>
      ))}
      {tabs.length === 0 && (
        <p className="p-4 text-center text-muted-foreground">
          {emptyMessage || 'No tabs found.'}
        </p>
      )}
    </div>
  );
}

function truncateUrl(url: string, max = 50) {
  const stripped = url.replace(/^https?:\/\//, '');
  return stripped.length > max ? `${stripped.slice(0, max)}…` : stripped;
}

function Favicon({ url }: { url: string }) {
  const [error, setError] = useState(false);
  const domain = new URL(url).hostname;
  if (error) {
    return <span className="w-4 h-4 flex items-center justify-center">📄</span>;
  }
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}`}
      alt=""
      className="w-4 h-4 flex-shrink-0"
      onError={() => setError(true)}
    />
  );
}
