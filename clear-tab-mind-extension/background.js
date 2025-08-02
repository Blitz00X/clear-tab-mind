// Background service worker for Clear Tab Mind extension

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Clear Tab Mind extension installed');
  
  // Create context menu item
  chrome.contextMenus.create({
    id: 'addToClearTabMind',
    title: 'Add to Clear Tab Mind',
    contexts: ['link', 'page']
  });
  
  // Initialize file storage with default collection
  initializeFileStorage();
});

// File storage system with collections
let collectionsCache = new Map();
let lastCacheUpdate = 0;
const CACHE_DURATION = 30000; // 30 seconds

// Initialize file storage
async function initializeFileStorage() {
  try {
    // Create storage directory if it doesn't exist
    await chrome.storage.local.set({ 
      fileStorageInitialized: true,
      lastFileUpdate: Date.now()
    });
    
    // Load initial collections
    await loadCollectionsFromStorage();
    
    // Migrate old data if needed
    await migrateOldData();
    
    // Create default collection if none exists
    if (collectionsCache.size === 0) {
      await createDefaultCollection();
    }
  } catch (error) {
    console.error('Error initializing file storage:', error);
  }
}

// Migrate old savedTabs data to new collections format
async function migrateOldData() {
  try {
    const result = await chrome.storage.local.get(['savedTabs', 'migrationCompleted']);
    
    // If migration is already completed, skip
    if (result.migrationCompleted) {
      return;
    }
    
    const oldSavedTabs = result.savedTabs || [];
    
    if (oldSavedTabs.length > 0) {
      console.log('Migrating old data:', oldSavedTabs.length, 'tabs');
      
      // Create default collection if it doesn't exist
      let defaultCollection = collectionsCache.get('default');
      if (!defaultCollection) {
        defaultCollection = {
          id: 'default',
          name: 'LaterTab',
          description: 'Default collection for saved tabs',
          created_at: new Date().toISOString(),
          tabs: []
        };
      }
      
      // Convert old tabs to new format and add to default collection
      const migratedTabs = oldSavedTabs.map(tab => ({
        id: tab.id || Date.now().toString(),
        title: tab.title || 'Untitled',
        url: tab.url || '',
        domain: tab.domain || new URL(tab.url || 'https://example.com').hostname,
        tags: tab.tags || [],
        note: tab.note || '',
        status: tab.status || 'unread',
        created_at: tab.created_at || new Date().toISOString()
      }));
      
      // Add migrated tabs to default collection
      defaultCollection.tabs = [...migratedTabs, ...defaultCollection.tabs];
      collectionsCache.set('default', defaultCollection);
      
      // Save the migrated data
      await saveCollectionsToStorage();
      
      // Mark migration as completed
      await chrome.storage.local.set({ migrationCompleted: true });
      
      console.log('Migration completed successfully');
    }
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

// Create default collection
async function createDefaultCollection() {
  const defaultCollection = {
    id: 'default',
    name: 'LaterTab',
    description: 'Default collection for saved tabs',
    created_at: new Date().toISOString(),
    tabs: []
  };
  
  collectionsCache.set('default', defaultCollection);
  await saveCollectionsToStorage();
}

// Load collections from storage
async function loadCollectionsFromStorage() {
  try {
    const result = await chrome.storage.local.get(['collections', 'lastFileUpdate']);
    const collections = result.collections || [];
    
    // Clear cache and rebuild
    collectionsCache.clear();
    collections.forEach(collection => {
      collectionsCache.set(collection.id, collection);
    });
    
    lastCacheUpdate = Date.now();
    return collections;
  } catch (error) {
    console.error('Error loading collections:', error);
    return [];
  }
}

// Save collections to storage
async function saveCollectionsToStorage() {
  try {
    const collectionsArray = Array.from(collectionsCache.values());
    await chrome.storage.local.set({ 
      collections: collectionsArray,
      lastFileUpdate: Date.now()
    });
    lastCacheUpdate = Date.now();
  } catch (error) {
    console.error('Error saving collections:', error);
  }
}

// Get collections with tab counts
async function getCollectionsWithCounts() {
  await ensureCacheIsFresh();
  
  const collections = Array.from(collectionsCache.values()).map(collection => ({
    id: collection.id,
    name: collection.name,
    description: collection.description,
    created_at: collection.created_at,
    tabCount: collection.tabs.length,
    unreadCount: collection.tabs.filter(tab => tab.status === 'unread').length
  }));
  
  // Sort by creation date (newest first)
  collections.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  return collections;
}

// Get tabs from a specific collection with pagination
async function getTabsFromCollection(collectionId, page = 1, limit = 20, filter = 'all') {
  await ensureCacheIsFresh();
  
  const collection = collectionsCache.get(collectionId);
  if (!collection) {
    return { tabs: [], total: 0, page: 1, totalPages: 0, hasMore: false };
  }
  
  let tabs = [...collection.tabs];
  
  // Apply filters
  if (filter !== 'all') {
    tabs = tabs.filter(tab => tab.status === filter);
  }
  
  // Sort by creation date (newest first)
  tabs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  // Calculate pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedTabs = tabs.slice(startIndex, endIndex);
  
  return {
    tabs: paginatedTabs,
    total: tabs.length,
    page: page,
    totalPages: Math.ceil(tabs.length / limit),
    hasMore: endIndex < tabs.length,
    collection: {
      id: collection.id,
      name: collection.name,
      description: collection.description
    }
  };
}

// Ensure cache is fresh
async function ensureCacheIsFresh() {
  if (Date.now() - lastCacheUpdate > CACHE_DURATION) {
    await loadCollectionsFromStorage();
  }
}

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'addToClearTabMind') {
    handleAddToClearTabMind(info, tab, '');
  }
});

// Get the proper title for the link
async function getLinkTitle(info, tab) {
  // If it's a link, use the link text or try to extract title from the link
  if (info.linkUrl) {
    // Use link text if available
    if (info.linkText && info.linkText.trim()) {
      return info.linkText.trim();
    }
    
    // Try to extract title from the link URL
    const url = new URL(info.linkUrl);
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
      // For YouTube, try to get the actual video title
      const videoTitle = await getYouTubeVideoTitle(info.linkUrl);
      if (videoTitle) {
        return videoTitle;
      }
      
      // Fallback to video ID
      const videoId = url.searchParams.get('v') || url.pathname.split('/').pop();
      if (videoId && videoId !== 'watch') {
        return `YouTube Video (${videoId})`;
      }
    }
    
    // Fallback to domain name
    return `${url.hostname} - ${url.pathname.split('/').pop() || 'page'}`;
  }
  
  // If it's the current page, use the page title
  return tab.title;
}

// Function to get YouTube video title
async function getYouTubeVideoTitle(url) {
  try {
    const urlObj = new URL(url);
    const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
    
    if (!videoId || videoId === 'watch') {
      return null;
    }
    
    // Try to get video title from YouTube's oEmbed API
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    
    const response = await fetch(oembedUrl);
    if (response.ok) {
      const data = await response.json();
      return data.title;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching YouTube video title:', error);
    return null;
  }
}

// Handle adding to Clear Tab Mind
async function handleAddToClearTabMind(info, tab, note = '') {
  const url = info.linkUrl || tab.url;
  const title = await getLinkTitle(info, tab);
  const domain = new URL(url).hostname;
  
  const tabData = {
    id: Date.now().toString(),
    title: title,
    url: url,
    domain: domain,
    tags: [],
    note: note,
    status: 'unread',
    created_at: new Date().toISOString()
  };
  
  try {
    // Add to default collection
    const defaultCollection = collectionsCache.get('default');
    if (defaultCollection) {
      defaultCollection.tabs.unshift(tabData);
      collectionsCache.set('default', defaultCollection);
      await saveCollectionsToStorage();
    }
    
    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Clear Tab Mind',
      message: `"${title}" has been saved to LaterTab!`
    });
    
    console.log('Tab saved via context menu:', tabData);
  } catch (error) {
    console.error('Error saving tab via context menu:', error);
  }
}

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCurrentTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] });
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'saveTab') {
    const tabData = {
      id: Date.now().toString(),
      title: request.title,
      url: request.url,
      domain: new URL(request.url).hostname,
      tags: request.tags || [],
      note: request.note || '',
      status: 'unread',
      created_at: new Date().toISOString()
    };
    
    // Add to specified collection or default
    const collectionId = request.collectionId || 'default';
    const collection = collectionsCache.get(collectionId);
    if (collection) {
      collection.tabs.unshift(tabData);
      collectionsCache.set(collectionId, collection);
      saveCollectionsToStorage().then(() => {
        sendResponse({ success: true, tab: tabData });
      });
    } else {
      sendResponse({ success: false, error: 'Collection not found' });
    }
    return true;
  }
  
  if (request.action === 'getCollections') {
    getCollectionsWithCounts().then(collections => {
      sendResponse(collections);
    });
    return true;
  }
  
  if (request.action === 'getTabsFromCollection') {
    getTabsFromCollection(
      request.collectionId, 
      request.page || 1, 
      request.limit || 20, 
      request.filter || 'all'
    ).then(result => {
      sendResponse(result);
    });
    return true;
  }
  
  if (request.action === 'createCollection') {
    const newCollection = {
      id: Date.now().toString(),
      name: request.name,
      description: request.description || '',
      created_at: new Date().toISOString(),
      tabs: []
    };
    
    collectionsCache.set(newCollection.id, newCollection);
    saveCollectionsToStorage().then(() => {
      sendResponse({ success: true, collection: newCollection });
    });
    return true;
  }
  
  if (request.action === 'deleteCollection') {
    const collection = collectionsCache.get(request.collectionId);
    if (collection && collection.id !== 'default') {
      collectionsCache.delete(request.collectionId);
      saveCollectionsToStorage().then(() => {
        sendResponse({ success: true });
      });
    } else {
      sendResponse({ success: false, error: 'Cannot delete default collection' });
    }
    return true;
  }
  
  if (request.action === 'updateTabStatus') {
    const collection = collectionsCache.get(request.collectionId);
    if (collection) {
      const tab = collection.tabs.find(t => t.id === request.tabId);
      if (tab) {
        tab.status = request.status;
        collectionsCache.set(request.collectionId, collection);
        saveCollectionsToStorage().then(() => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false });
      }
    } else {
      sendResponse({ success: false });
    }
    return true;
  }
  
  if (request.action === 'deleteTab') {
    const collection = collectionsCache.get(request.collectionId);
    if (collection) {
      collection.tabs = collection.tabs.filter(tab => tab.id !== request.tabId);
      collectionsCache.set(request.collectionId, collection);
      saveCollectionsToStorage().then(() => {
        sendResponse({ success: true });
      });
    } else {
      sendResponse({ success: false });
    }
    return true;
  }
  
  if (request.action === 'searchTabs') {
    ensureCacheIsFresh().then(() => {
      const searchQuery = request.query.toLowerCase();
      const allTabs = [];
      
      // Collect all tabs from all collections
      collectionsCache.forEach(collection => {
        collection.tabs.forEach(tab => {
          allTabs.push({
            ...tab,
            collectionId: collection.id,
            collectionName: collection.name
          });
        });
      });
      
      const filteredTabs = allTabs.filter(tab => 
        tab.title.toLowerCase().includes(searchQuery) ||
        tab.url.toLowerCase().includes(searchQuery) ||
        tab.domain.toLowerCase().includes(searchQuery) ||
        tab.tags.some(tag => tag.toLowerCase().includes(searchQuery)) ||
        tab.note.toLowerCase().includes(searchQuery)
      );
      
      // Sort by relevance (exact matches first)
      filteredTabs.sort((a, b) => {
        const aExact = a.title.toLowerCase() === searchQuery;
        const bExact = b.title.toLowerCase() === searchQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      sendResponse({ tabs: filteredTabs, total: filteredTabs.length });
    });
    return true;
  }
  
  if (request.action === 'saveFromContextMenu') {
    handleAddToClearTabMind(request.info, request.tab, request.note);
    sendResponse({ success: true });
    return true;
  }
}); 