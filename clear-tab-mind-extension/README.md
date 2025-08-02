# Clear Tab Mind - Chrome Extension

A Chrome extension that helps you save and organize your browser tabs to clear your mind and reduce tab clutter.

## Features

- **Save Current Tab**: Quickly save the current tab with tags and notes
- **Tab Organization**: Organize saved tabs with tags and status (unread/read/archived)
- **Local Storage**: All data is stored locally in your browser
- **Quick Access**: View and manage your saved tabs from the extension popup
- **Tab Management**: Mark tabs as read, archive them, or delete them

## Installation

### Development Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the directory containing the extension files
5. The extension should now appear in your extensions list

### Files Structure

```
clear-tab-mind/
├── manifest.json          # Extension manifest
├── popup.html            # Popup HTML
├── popup.js              # Popup JavaScript
├── popup.css             # Popup styles
├── background.js         # Background service worker
├── content.js            # Content script
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── CHROME_EXTENSION_README.md
```

## Usage

1. **Save a Tab**: Click the extension icon while on any webpage, add tags and notes, then click "Save Tab"
2. **View Saved Tabs**: Click the extension icon to see your saved tabs
3. **Manage Tabs**: Use the action buttons to open, mark as read, or delete tabs
4. **Organize**: Use tags to categorize your tabs and keep them organized

## How it Works

- **Background Script**: Handles tab management and local storage operations
- **Popup**: Provides the user interface for saving and managing tabs
- **Content Script**: Extracts page information when needed
- **Local Storage**: Uses Chrome's storage API to persist data locally

## Data Storage

All saved tabs are stored locally in your browser using Chrome's storage API. No data is sent to external servers.

## Permissions

- `activeTab`: To access information about the current tab
- `storage`: To save and retrieve tab data locally
- `tabs`: To create new tabs when opening saved links

## Development

To modify the extension:

1. Edit the relevant files (popup.js, background.js, etc.)
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## Building for Production

To create a distributable version:

1. Create a ZIP file containing all extension files
2. Upload to the Chrome Web Store or distribute manually

## Troubleshooting

- If the extension doesn't work, check the browser console for errors
- Make sure all required files are present in the extension directory
- Verify that the manifest.json file is valid

## License

This project is open source and available under the MIT License. 