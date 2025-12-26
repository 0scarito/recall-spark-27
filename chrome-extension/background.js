// Background service worker - handles communication between content scripts and popup

// Configuration - update with your Supabase URL
const CONFIG = {
  supabaseUrl: 'https://mvedoscvslmbieugxknd.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12ZWRvc2N2c2xtYmlldWd4a25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMzQxOTAsImV4cCI6MjA3NzgxMDE5MH0.vVztPm4EwISXC9wpbdF-Jg7TSxHILxIEk1sc-IaYPps'
};

// Check if URL is YouTube
function isYouTubeUrl(url) {
  return url.includes('youtube.com/watch') || url.includes('youtu.be/');
}

// Inject content script if needed
async function ensureContentScript(tabId, isYouTube) {
  try {
    // Try to ping existing content script
    const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    return response?.status === 'ok';
  } catch (e) {
    // Content script not loaded, inject it
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
  
  // Small delay to ensure script is ready
  await new Promise(resolve => setTimeout(resolve, 100));

  const action = isYouTube ? 'extractYouTubeData' : 'extractPageData';
  const data = await chrome.tabs.sendMessage(tabId, { action });
  
  return {
    ...data,
    isYouTube,
    sourceUrl: url
  };
}

// Save to Supabase via edge function
async function saveToBackend(data, accessToken) {
  const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/save-from-extension`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken || CONFIG.supabaseAnonKey}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to save: ${error}`);
  }

  return response.json();
}

// Get stored auth token
async function getAuthToken() {
  const result = await chrome.storage.local.get(['supabase_access_token']);
  return result.supabase_access_token;
}

// Store auth token
async function setAuthToken(token) {
  await chrome.storage.local.set({ supabase_access_token: token });
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
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
          
          const data = await extractFromTab(tab.id, tab.url);
          if (data.error) {
            sendResponse({ error: data.error });
            return;
          }

          const token = await getAuthToken();
          const result = await saveToBackend(data, token);
          sendResponse({ success: true, ...result });
          break;
        }

        case 'setAuthToken': {
          await setAuthToken(request.token);
          sendResponse({ success: true });
          break;
        }

        case 'getAuthToken': {
          const token = await getAuthToken();
          sendResponse({ token });
          break;
        }

        case 'checkAuth': {
          const token = await getAuthToken();
          sendResponse({ isAuthenticated: !!token });
          break;
        }

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ error: error.message });
    }
  })();
  
  return true; // Keep channel open for async response
});

// Listen for extension icon click (quick save)
chrome.action.onClicked.addListener(async (tab) => {
  // This only fires if popup is not defined
  // Since we have a popup, this won't be called
});

console.log('[Recap Extension] Background service worker loaded');
