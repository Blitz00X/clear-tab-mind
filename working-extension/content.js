// Content script for Clear Tab Mind extension

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageInfo') {
    const pageInfo = {
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname
    };
    sendResponse(pageInfo);
  }
});

// Inject a small script to get page metadata
const script = document.createElement('script');
script.textContent = `
  window.clearTabMind = {
    getPageInfo: () => ({
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname,
      description: document.querySelector('meta[name="description"]')?.content || '',
      keywords: document.querySelector('meta[name="keywords"]')?.content || ''
    })
  };
`;
document.head.appendChild(script); 