# Clear Tab Mind

**Clear Tab Mind** is a Chrome/Brave extension and companion React app for managing browser tabs, videos, RSS feeds, and notes at scale — built with Vite, React, TypeScript, IndexedDB (Dexie.js), and the full Chrome Extension MV3 API set.

> Version 2.0 – full rewrite with workspaces, tab hibernation, RSS integration, and a professional multi-panel UI.

## Features

### 🗄️Data Architecture
- **IndexedDB (Dexie.js)** storage — scales to 1000+ items with indexed queries (replaces 5 MB `chrome.storage.local` limit)
- Four item types: **Tab**, **Video** (YouTube/Vimeo), **RSS_Feed**, **Note**
- Each item carries: title, URL, favicon, thumbnail, tags, folder, workspace, status, and rich metadata
- **Infinite nested folders** — unlimited depth, color-coded, draggable
- **Workspaces** — completely isolated tab groups with their own folder trees

###  Session Manager
- **Tab Hibernation** — tabs inactive for 30+ minutes are auto-saved to IndexedDB and closed; one click to restore
- **Brave-style Tab Groups** — open tabs auto-grouped by folder name via `chrome.tabGroups`
- **Context Switching** — switching workspace saves all current tabs and restores the target workspace's tabs
- **Duplicate Detection** — finds and removes duplicate URLs across 1000s of items

###  RSS & Media Hub
- **RSS/Atom Parser** — background polling at configurable intervals (15 min – 24 h), new items added as "Unread"
- **Link Scraper** — YouTube/Vimeo oEmbed for auto-title + thumbnail; Open Graph fallback for all other sites
- **Media Grid** — Video items display as a responsive thumbnail grid (2–5 columns) with platform badge and duration
- **Fuzzy Search** — Fuse.js search across title, tags, URL, and notes with keyboard navigation

###  Professional UI
- **Chrome Side Panel** — always-on panel with quick-save, folder tree, hibernated tabs, and unread queue
- **Full-page Dashboard** — 3-column layout: folder sidebar | item list/grid | actions; status filters, view toggle
- **Command Palette** — `Ctrl+Shift+K` for searching items, switching workspaces, adding RSS feeds, and grouping tabs

## Project Layout

```
clear-tab-mind/
├── manifest.json          # MV3 manifest (v2.0.0)
├── background.js          # Service worker: alarms, tab tracking, context menus
├── content.js             # Content script: page metadata extraction
├── popup.html             # Traditional popup
├── sidepanel.html         # Chrome Side Panel entry
├── index.html             # Full-page dashboard entry
│
├── src/
│   ├── types/index.ts            # Item, Folder, Workspace, RssFeed types
│   ├── services/
│   │   ├── db.ts                 # Dexie.js schema & seeding
│   │   ├── dataService.ts        # CRUD, dedup, folder tree builder
│   │   ├── sessionManager.ts     # Tab hibernation logic
│   │   ├── tabGroupService.ts    # chrome.tabGroups auto-grouping
│   │   ├── workspaceService.ts   # Workspace context switching
│   │   ├── rssParser.ts          # RSS/Atom feed fetcher & parser
│   │   └── linkScraper.ts        # oEmbed + Open Graph metadata
│   ├── hooks/
│   │   └── useWorkspaceData.ts   # Master data hook
│   ├── components/
│   │   ├── FolderTree.tsx         # Recursive folder tree
│   │   ├── WorkspaceSelector.tsx  # Workspace switcher dropdown
│   │   ├── CommandPalette.tsx     # Ctrl+Shift+K palette (cmdk)
│   │   ├── FuzzySearch.tsx        # Fuse.js search bar
│   │   ├── MediaGrid.tsx          # Thumbnail grid for videos
│   │   ├── RssFeedManager.tsx     # RSS feed CRUD UI
│   │   └── ui/                    # shadcn/ui primitives
│   ├── pages/
│   │   ├── Dashboard.tsx          # Full-page dashboard
│   │   └── SidePanel.tsx          # Side panel compact view
│   └── sidepanel-main.tsx         # Side panel React entry
│
└── supabase/              # Auth migrations (Supabase auth still used)
```

## Development

```bash
# Install dependencies
npm install

# Start dev server (dashboard at localhost:8080)
npm run dev

# Build all entries for the extension
npm run build
```

After running `npm run build`, copy the static extension files into `dist/`:

```bash
cp background.js content.js manifest.json dist/
cp -r icons dist/
```

Then load `dist/` as an unpacked extension in Chrome.

## Permissions Used

| Permission | Purpose |
|---|---|
| `tabs` | Tab metadata, open/close, create |
| `tabGroups` | Brave-style folder grouping |
| `alarms` | Hibernation check (5 min), RSS polling (60 min) |
| `sidePanel` | Persistent sidebar |
| `contextMenus` | Right-click "Add to Clear Tab Mind" |
| `scripting` | Content script injection |
| `notifications` | Save confirmations |
| `storage` | Extension settings fallback |

## Documentation

- [`INSTALLATION.md`](INSTALLATION.md) — step-by-step Chrome setup
- [`CHROME_EXTENSION_README.md`](CHROME_EXTENSION_README.md) — extension-specific guide

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).
