// Background service worker for Clear Tab Mind extension

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Clear Tab Mind extension installed');
});

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
    
    chrome.storage.local.get(['savedTabs'], (result) => {
      const savedTabs = result.savedTabs || [];
      savedTabs.unshift(tabData);
      chrome.storage.local.set({ savedTabs }, () => {
        sendResponse({ success: true, tab: tabData });
      });
    });
    return true;
  }
  
  if (request.action === 'getSavedTabs') {
    chrome.storage.local.get(['savedTabs'], (result) => {
      sendResponse({ tabs: result.savedTabs || [] });
    });
    return true;
  }
  
  if (request.action === 'updateTabStatus') {
    chrome.storage.local.get(['savedTabs'], (result) => {
      const savedTabs = result.savedTabs || [];
      const updatedTabs = savedTabs.map(tab => 
        tab.id === request.tabId 
          ? { ...tab, status: request.status }
          : tab
      );
      chrome.storage.local.set({ savedTabs: updatedTabs }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
  
  if (request.action === 'deleteTab') {
    chrome.storage.local.get(['savedTabs'], (result) => {
      const savedTabs = result.savedTabs || [];
      const updatedTabs = savedTabs.filter(tab => tab.id !== request.tabId);
      chrome.storage.local.set({ savedTabs: updatedTabs }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
}); 