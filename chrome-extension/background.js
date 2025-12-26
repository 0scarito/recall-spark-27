// Background service worker - handles communication between content scripts and popup

// Configuration
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
  
  return {
    ...data,
    isYouTube,
    sourceUrl: url
  };
}

// Get stored auth data
async function getAuthData() {
  return chrome.storage.local.get([
    'supabase_access_token',
    'supabase_refresh_token',
    'supabase_user'
  ]);
}

// Check if user is authenticated
async function isAuthenticated() {
  const { supabase_access_token, supabase_user } = await getAuthData();
  return !!(supabase_access_token && supabase_user);
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

        case 'checkAuth': {
          const authenticated = await isAuthenticated();
          const authData = await getAuthData();
          sendResponse({ 
            isAuthenticated: authenticated,
            user: authData.supabase_user || null
          });
          break;
        }

        case 'getAuthData': {
          const authData = await getAuthData();
          sendResponse(authData);
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
  
  return true;
});

console.log('[Recap Extension] Background service worker loaded');
