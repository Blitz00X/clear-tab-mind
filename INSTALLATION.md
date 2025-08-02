# Clear Tab Mind - Installation Guide

## Quick Installation

### Option 1: Load Unpacked Extension (Recommended for Development)

1. **Download the Extension**
   - The extension files are in the `clear-tab-mind-extension/` folder
   - Or use the ZIP file: `clear-tab-mind-extension.zip`

2. **Open Chrome Extensions Page**
   - Open Chrome browser
   - Navigate to `chrome://extensions/`
   - Or go to Chrome menu → More tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**
   - Click "Load unpacked" button
   - Select the `clear-tab-mind-extension` folder
   - The extension should now appear in your extensions list

5. **Pin the Extension**
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Clear Tab Mind" and click the pin icon
   - The extension icon will now appear in your toolbar

### Option 2: Install from ZIP

1. **Extract the ZIP file**
   ```bash
   unzip clear-tab-mind-extension.zip
   ```

2. **Follow steps 2-5 from Option 1**

## Usage

1. **Save a Tab**: Click the extension icon while on any webpage
2. **Add Tags**: Enter comma-separated tags (e.g., "work, research, todo")
3. **Add Notes**: Write a note about the tab (optional)
4. **Save**: Click "Save Tab" to store it locally
5. **Manage**: View saved tabs and mark them as read or delete them

## Features

- ✅ Save current tab with tags and notes
- ✅ View all saved tabs in the popup
- ✅ Mark tabs as read/unread
- ✅ Delete saved tabs
- ✅ Open saved tabs in new windows
- ✅ Local storage (no data sent to servers)
- ✅ Clean, modern interface

## Troubleshooting

**Extension not loading?**
- Make sure all files are present in the extension folder
- Check that `manifest.json` is valid
- Try refreshing the extensions page

**Extension not working?**
- Check the browser console for errors
- Make sure you're on a valid webpage (not chrome:// pages)
- Try disabling and re-enabling the extension

**Icons not showing?**
- The extension includes placeholder icons
- You can replace them with custom icons in the `icons/` folder

## Development

To modify the extension:
1. Edit the files in the extension folder
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## Support

If you encounter any issues:
1. Check the browser console for error messages
2. Verify all required permissions are granted
3. Try reinstalling the extension 