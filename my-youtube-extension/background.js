// Background service worker - handles communication between content scripts and popup

const CONFIG = {
  appUrl: 'https://recall-spark-27.lovable.app',
  supabaseUrl: 'https://mvedoscvslmbieugxknd.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12ZWRvc2N2c2xtYmlldWd4a25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMzQxOTAsImV4cCI6MjA3NzgxMDE5MH0.vVztPm4EwISXC9wpbdF-Jg7TSxHILxIEk1sc-IaYPps'
};

// Check if URL is YouTube
function isYouTubeUrl(url) {
  return url && (url.includes('youtube.com/watch') || url.includes('youtu.be/'));
}

// Inject content script if needed
async function ensureContentScript(tabId, isYouTube) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    return response?.status === 'ok';
  } catch (e) {
    const scriptFile = isYouTube ? 'content-youtube.js' : 'content-generic.js';
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [scriptFile]
    });
    return true;
  }
}

// Extract data from current tab
async function extractFromTab(tabId, url) {
  const isYouTube = isYouTubeUrl(url);
  
  await ensureContentScript(tabId, isYouTube);
  await new Promise(resolve => setTimeout(resolve, 100));

  const action = isYouTube ? 'extractYouTubeData' : 'extractPageData';
  const data = await chrome.tabs.sendMessage(tabId, { action });
  
  return { ...data, isYouTube, sourceUrl: url };
}

// Save to backend via edge function
async function saveToBackend(data, accessToken) {
  // Input validation
  if (!data.sourceUrl || typeof data.sourceUrl !== 'string') {
    throw new Error('Invalid URL');
  }
  
  // Limit content size to prevent abuse
  const maxContentLength = 100000;
  if (data.transcript && data.transcript.length > maxContentLength) {
    data.transcript = data.transcript.substring(0, maxContentLength);
  }
  if (data.content && data.content.length > maxContentLength) {
    data.content = data.content.substring(0, maxContentLength);
  }

  const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/save-from-extension`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken || CONFIG.supabaseAnonKey}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    let errorText = await response.text();
    try {
      const errorJson = JSON.parse(errorText);
      errorText = errorJson.error || errorJson.message || errorText;
    } catch (e) {}
    
    if (response.status === 401 || errorText.includes('Unauthorized')) {
      throw new Error('Unauthorized - please sign in');
    }
    throw new Error(`Failed to save: ${errorText}`);
  }

  return response.json();
}

// Auth token management
async function getAuthData() {
  const result = await chrome.storage.local.get(['supabase_access_token', 'supabase_refresh_token']);
  return {
    accessToken: result.supabase_access_token,
    refreshToken: result.supabase_refresh_token
  };
}

async function setAuthData(accessToken, refreshToken) {
  await chrome.storage.local.set({ 
    supabase_access_token: accessToken,
    supabase_refresh_token: refreshToken 
  });
}

async function clearAuthData() {
  await chrome.storage.local.remove(['supabase_access_token', 'supabase_refresh_token']);
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      // Handle auth token from content script
      if (request.type === 'RECAP_EXTENSION_AUTH' && request.success) {
        console.log('[Recap] Received auth token');
        await setAuthData(request.token, request.refreshToken);
        
        // Close auth tab
        if (sender.tab?.id) {
          try {
            await chrome.tabs.remove(sender.tab.id);
          } catch (e) {
            console.log('[Recap] Could not close auth tab:', e);
          }
        }
        sendResponse({ success: true });
        return;
      }

      switch (request.action) {
        case 'extractCurrentPage': {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) {
            sendResponse({ error: 'No active tab found' });
            return;
          }
          const data = await extractFromTab(tab.id, tab.url);
          sendResponse(data);
          break;
        }

        case 'saveCurrentPage': {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab) {
            sendResponse({ error: 'No active tab found' });
            return;
          }
          
          const { accessToken } = await getAuthData();
          if (!accessToken) {
            sendResponse({ error: 'Not authenticated', needsAuth: true });
            return;
          }

          const data = await extractFromTab(tab.id, tab.url);
          if (data.error) {
            sendResponse({ error: data.error });
            return;
          }

          const result = await saveToBackend(data, accessToken);
          sendResponse({ success: true, ...result });
          break;
        }

        case 'checkAuth': {
          const { accessToken } = await getAuthData();
          sendResponse({ isAuthenticated: !!accessToken });
          break;
        }

        case 'setAuthToken': {
          await setAuthData(request.token, request.refreshToken);
          sendResponse({ success: true });
          break;
        }

        case 'clearAuth': {
          await clearAuthData();
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('[Recap] Background error:', error);
      sendResponse({ error: error.message });
    }
  })();
  
  return true;
});

console.log('[Recap Extension] Background service worker loaded');
