# Clear Tab Mind – Installation Guide

## Requirements

- Google Chrome (version 116+) or Brave Browser
- Node.js 18+ (for building from source)

---

## Option 1: Build from Source (Recommended)

### 1. Clone and install

```bash
git clone https://github.com/Blitz00X/clear-tab-mind.git
cd clear-tab-mind
npm install
```

### 2. Build the extension

```bash
npm run build
```

This produces a `dist/` folder with three HTML entries:
- `dist/index.html` — Full-page dashboard  
- `dist/sidepanel.html` — Chrome Side Panel  
- `dist/popup.html` — Traditional popup

### 3. Copy static extension files into `dist/`

The background service worker, content script, icons, and manifest are not bundled by Vite — copy them manually:

```bash
cp background.js content.js manifest.json dist/
cp -r icons dist/
```

### 4. Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder
5. The extension installs and the icon appears in your toolbar

### 5. Open the Side Panel

Click the **Clear Tab Mind icon** in the toolbar to open the Side Panel. Or click **Open full dashboard** inside the panel to open the full-page view.

---

## Option 2: Development Mode (Hot Reload)

Run the React dev server to iterate on the dashboard UI without rebuilding:

```bash
npm run dev
```

Then load the **repository root** (not `dist/`) as an unpacked extension — the background worker and popup use the source files directly while the dashboard runs at `localhost:8080`.

> ⚠️ In dev mode the Side Panel opens `sidepanel.html` from the repo root, bypassing Vite. Changes to React components require a manual rebuild for the extension to pick them up.

---

## Using the Extension

### Quick Save (Side Panel)
1. Click the extension icon → Side Panel opens
2. Paste a URL into the **Quick save** field and press Enter
3. The item is saved with auto-detected type; YouTube/Vimeo thumbnails fetched automatically

### Context Menu
Right-click any link or page → **Add to Clear Tab Mind** — the item is saved without leaving your current context.

### Command Palette (`Ctrl+Shift+K`)
Opens a command bar for:
- Searching all items (title, URL, tags)
- Switching workspaces
- Adding RSS feeds
- Grouping open tabs by folder

### Workspaces
- Create workspaces via the **WorkspaceSelector** dropdown
- Switching workspace **saves all current tabs** (hibernated state) and **restores** the target workspace's tabs

### Tab Hibernation
Tabs inactive for **30+ minutes** are automatically:
1. Saved to IndexedDB with status `hibernated`
2. Removed from the browser
3. Shown in the **Hibernated** section of the Side Panel for one-click restore

### RSS Feeds
1. Open Dashboard → left sidebar → **📡** tab → **Add Feed**
2. Paste an RSS/Atom URL, choose a folder and polling interval
3. New entries appear as **unread** items in the chosen folder

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Extension icon missing | Pin it via the puzzle piece menu in the toolbar |
| Side Panel blank | Ensure `sidepanel.html` was copied to `dist/` |
| Tab groups not working | Requires Chrome 89+ with Tab Groups enabled |
| Hibernation not triggering | Check that `chrome.alarms` permission was granted; reload extension |
| RSS feed not updating | Verify the feed URL returns valid XML; check the error count in the feed list |
| Build errors | Run `npm install` first; ensure Node 18+ |

---

## Updating the Extension

1. Pull the latest changes: `git pull`
2. Rebuild: `npm run build && cp background.js content.js manifest.json icons dist/`
3. Go to `chrome://extensions/` → click the **refresh** icon on the Clear Tab Mind card

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).