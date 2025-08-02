// Content script for Clear Tab Mind extension

// Listen for messages from the popup and background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageInfo') {
    const pageInfo = {
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname
    };
    sendResponse(pageInfo);
  }
  
  if (request.action === 'getLinkInfo') {
    // Get information about a specific link
    getLinkInfo(request.url).then(linkInfo => {
      sendResponse(linkInfo);
    });
    return true; // Keep message channel open for async response
  }
});

// Function to get better link information
async function getBetterLinkInfo(url, linkText) {
  try {
    const urlObj = new URL(url);
    
    // Use link text if available (this is the most reliable)
    if (linkText && linkText.trim()) {
      return {
        title: linkText.trim(),
        url: url,
        domain: urlObj.hostname
      };
    }
    
    // Special handling for YouTube
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      // Try to get the actual video title from YouTube API
      const videoTitle = await getYouTubeVideoTitle(url);
      if (videoTitle) {
        return {
          title: videoTitle,
          url: url,
          domain: 'youtube.com'
        };
      }
      
      // Try to find the link text on the current page
      const links = document.querySelectorAll('a[href]');
      for (let link of links) {
        if (link.href === url && link.textContent.trim()) {
          return {
            title: link.textContent.trim(),
            url: url,
            domain: 'youtube.com'
          };
        }
      }
      
      // Fallback to video ID
      const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
      if (videoId && videoId !== 'watch') {
        return {
          title: `YouTube Video (${videoId})`,
          url: url,
          domain: 'youtube.com'
        };
      }
    }
    
    // For other sites, try to find the link text
    const links = document.querySelectorAll('a[href]');
    for (let link of links) {
      if (link.href === url && link.textContent.trim()) {
        return {
          title: link.textContent.trim(),
          url: url,
          domain: urlObj.hostname
        };
      }
    }
    
    // Fallback
    return {
      title: `${urlObj.hostname} - ${urlObj.pathname.split('/').pop() || 'page'}`,
      url: url,
      domain: urlObj.hostname
    };
  } catch (error) {
    return {
      title: 'Unknown Link',
      url: url,
      domain: 'unknown'
    };
  }
}

// Function to get YouTube video title from API
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

// Function to get better link information
async function getLinkInfo(url) {
  try {
    const urlObj = new URL(url);
    
    // Special handling for YouTube
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      // Try to get the actual video title from YouTube API
      const videoTitle = await getYouTubeVideoTitle(url);
      if (videoTitle) {
        return {
          title: videoTitle,
          url: url,
          domain: 'youtube.com'
        };
      }
      
      // Try to find the link text on the current page
      const links = document.querySelectorAll('a[href]');
      for (let link of links) {
        if (link.href === url && link.textContent.trim()) {
          return {
            title: link.textContent.trim(),
            url: url,
            domain: 'youtube.com'
          };
        }
      }
      
      const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
      if (videoId && videoId !== 'watch') {
        return {
          title: `YouTube Video (${videoId})`,
          url: url,
          domain: 'youtube.com'
        };
      }
    }
    
    // For other sites, try to find the link text
    const links = document.querySelectorAll('a[href]');
    for (let link of links) {
      if (link.href === url && link.textContent.trim()) {
        return {
          title: link.textContent.trim(),
          url: url,
          domain: urlObj.hostname
        };
      }
    }
    
    // Fallback
    return {
      title: `${urlObj.hostname} - ${urlObj.pathname.split('/').pop() || 'page'}`,
      url: url,
      domain: urlObj.hostname
    };
  } catch (error) {
    return {
      title: 'Unknown Link',
      url: url,
      domain: 'unknown'
    };
  }
}

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
    }),
    
    getLinkInfo: (url) => {
      try {
        const urlObj = new URL(url);
        const links = document.querySelectorAll('a[href]');
        for (let link of links) {
          if (link.href === url && link.textContent.trim()) {
            return {
              title: link.textContent.trim(),
              url: url,
              domain: urlObj.hostname
            };
          }
        }
        return {
          title: urlObj.hostname + ' - ' + (urlObj.pathname.split('/').pop() || 'page'),
          url: url,
          domain: urlObj.hostname
        };
      } catch (error) {
        return {
          title: 'Unknown Link',
          url: url,
          domain: 'unknown'
        };
      }
    }
  };
`;
document.head.appendChild(script); 