# Clear Tab Mind – Chrome Extension Guide

A Chrome/Brave extension (Manifest V3) for scalable tab management, RSS integration, video library, and workspace context switching.

## Key Features

| Feature | Description |
|---|---|
| 🌙 **Tab Hibernation** | Tabs inactive 30+ min auto-saved to IndexedDB and closed |
| 🗂️ **Workspaces** | Isolated tab groups; switching saves/restores all tabs |
| 📁 **Nested Folders** | Unlimited depth, color-coded, with unread counts |
| 🎬 **Video Gallery** | YouTube/Vimeo auto-thumbnail with media grid view |
| 📡 **RSS Integration** | Background polling, new items added as unread |
| 🔍 **Fuzzy Search** | Fuse.js search across title, tags, URL, and notes |
| ⌨️ **Command Palette** | `Ctrl+Shift+K` for all actions |
| 🧹 **Duplicate Cleanup** | Deduplication across 1000s of items |

## Chrome Permissions

| Permission | Reason |
|---|---|
| `activeTab` | Read current tab URL + title |
| `tabs` | Open/close/query all tabs |
| `tabGroups` | Brave-style folder grouping via chrome.tabGroups API |
| `alarms` | Scheduled hibernation (5 min) and RSS polling (60 min) |
| `sidePanel` | Persistent side panel (`sidepanel.html`) |
| `contextMenus` | Right-click "Add to Clear Tab Mind" on links and pages |
| `scripting` | Inject content scripts |
| `notifications` | Save confirmations |
| `storage` | Extension settings fallback |

## Data Storage

All user data (items, folders, workspaces, RSS feeds) is stored **locally** in **IndexedDB** via [Dexie.js](https://dexie.org). Nothing is sent to external servers. Supabase is used only for optional user authentication.

### Database Schema

```
items       → id, title, url, favicon, thumbnail_url, tags, folder_id, workspace_id, type, status, metadata
folders     → id, name, parent_id, workspace_id, color, icon, order
workspaces  → id, name, description, color, icon, is_active
rss_feeds   → id, url, name, folder_id, workspace_id, fetch_interval_minutes, last_fetched
```

## Entry Points

After building, the `dist/` folder contains three independent HTML entry points:

| File | Description |
|---|---|
| `index.html` | Full-page dashboard (open via `chrome-extension://[id]/index.html`) |
| `sidepanel.html` | Chrome Side Panel (opens when extension icon is clicked) |
| `popup.html` | Traditional popup (fallback for older Chrome versions) |

## Architecture

```
background.js (Service Worker)
  ├── chrome.alarms → hibernation check every 5 min
  ├── chrome.alarms → RSS poll trigger every 60 min
  ├── chrome.tabs.onActivated → track tab activity timestamps
  ├── chrome.contextMenus → "Add to Clear Tab Mind"
  └── chrome.runtime.onMessage → bridge for UI commands

React UI (Dashboard / SidePanel)
  ├── useWorkspaceData hook → all data operations
  ├── Dexie.js → IndexedDB (items, folders, workspaces, feeds)
  ├── rssParser.ts → fetch + parse RSS/Atom XML
  ├── linkScraper.ts → oEmbed (YouTube/Vimeo) + Open Graph
  ├── tabGroupService.ts → chrome.tabGroups auto-grouping
  └── workspaceService.ts → save/restore workspace tabs
```

## Building

```bash
npm install
npm run build
# Then copy static files:
cp background.js content.js manifest.json dist/
cp -r icons dist/
```

Load `dist/` as unpacked extension at `chrome://extensions/`.

## License

GNU General Public License v3.0