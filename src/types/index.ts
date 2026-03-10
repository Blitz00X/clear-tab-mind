// ============================================================
// Clear Tab Mind – Core TypeScript Types
// ============================================================

export type ItemType = 'Tab' | 'Video' | 'RSS_Feed' | 'Note';

export type ItemStatus = 'unread' | 'read' | 'archived' | 'hibernated';

export interface VideoMetadata {
  duration?: number;        // seconds
  channelName?: string;
  channelUrl?: string;
  viewCount?: number;
  platform?: 'youtube' | 'vimeo' | 'other';
}

export interface Item {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  thumbnail_url?: string;
  tags: string[];
  folder_id?: string;
  workspace_id: string;
  type: ItemType;
  status: ItemStatus;
  metadata?: VideoMetadata | Record<string, unknown>;
  note?: string;
  created_at: string;         // ISO string
  last_accessed_at?: string;  // ISO string – used for hibernation tracking
  // For hibernated tabs
  original_window_id?: number;
  original_index?: number;
}

export interface Folder {
  id: string;
  name: string;
  parent_id?: string | null;  // null = root folder
  workspace_id: string;
  color?: string;
  icon?: string;
  order: number;
  created_at: string;
}

export interface FolderWithChildren extends Folder {
  children: FolderWithChildren[];
  itemCount: number;
  unreadCount: number;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active: boolean;
  created_at: string;
}

export interface RssFeed {
  id: string;
  url: string;
  name: string;
  folder_id?: string;
  workspace_id: string;
  last_fetched?: string;  // ISO string
  fetch_interval_minutes: number;  // default 60
  error_count: number;
  created_at: string;
}

// Duplicate analysis result
export interface DuplicateGroup {
  normalizedUrl: string;
  items: Item[];
}

// Tab hibernation state stored by session manager
export interface TabActivityRecord {
  tabId: number;
  url: string;
  lastActiveAt: number;  // timestamp ms
  windowId: number;
  index: number;
}
