// Content script that runs on the extension auth page
// Bridges authentication between the web app and extension

(function() {
  'use strict';

  console.log('[Recap Auth] Content script loaded');

  // Listen for postMessage from the page
  window.addEventListener('message', (event) => {
    // Only accept messages from our app
    if (event.source !== window) return;
    
    const message = event.data;
    
    if (message && message.type === 'RECAP_EXTENSION_AUTH' && message.success) {
      console.log('[Recap Auth] Received auth token from page');
      
      // Forward to background script
      chrome.runtime.sendMessage({
        type: 'RECAP_EXTENSION_AUTH',
        token: message.token,
        refreshToken: message.refreshToken,
        success: true
      }).then(() => {
        console.log('[Recap Auth] Token forwarded to background');
      }).catch((err) => {
        console.error('[Recap Auth] Failed to forward token:', err);
      });
    }
  });

  // Also check URL for token (backup method)
  function checkUrlForToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth_success');
    const token = urlParams.get('token');
    
    if (authSuccess === 'true' && token) {
      console.log('[Recap Auth] Found token in URL');
      
      chrome.runtime.sendMessage({
        type: 'RECAP_EXTENSION_AUTH',
        token: token,
        refreshToken: urlParams.get('refresh_token'),
        success: true
      }).then(() => {
        console.log('[Recap Auth] Token from URL forwarded to background');
      }).catch((err) => {
        console.error('[Recap Auth] Failed to forward token from URL:', err);
      });
    }
  }

  // Check immediately and also observe URL changes
  checkUrlForToken();
  
  // Watch for URL changes (in case token is added after page load)
  const observer = new MutationObserver(() => {
    checkUrlForToken();
  });
  
  observer.observe(document.body, { childList: true, subtree: true });

  // Clean up observer after 2 minutes
  setTimeout(() => observer.disconnect(), 120000);
})();
