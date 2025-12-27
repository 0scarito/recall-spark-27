// Content script injected into ExtensionAuth page to bridge postMessage to extension
(function() {
  'use strict';

  console.log('[Extension Auth] Content script loaded');

  // Listen for postMessage from the ExtensionAuth page
  window.addEventListener('message', (event) => {
    // Only accept messages from the same origin
    if (event.origin !== window.location.origin) return;

    // Check if it's an auth token message
    if (event.data && event.data.type === 'RECAP_EXTENSION_AUTH' && event.data.success) {
      console.log('[Extension Auth] Received token from page, forwarding to extension');
      
      // Forward to background script
      chrome.runtime.sendMessage({
        type: 'RECAP_EXTENSION_AUTH',
        token: event.data.token,
        success: true
      }).then(() => {
        console.log('[Extension Auth] Token sent to extension successfully');
      }).catch((error) => {
        console.error('[Extension Auth] Failed to send token:', error);
      });
    }
  });

  // Also listen for direct messages from the page script
  // The page might send messages before this script loads
  const checkForToken = () => {
    // Try to get token from window if page already set it
    if (window.__RECAP_AUTH_TOKEN__) {
      chrome.runtime.sendMessage({
        type: 'RECAP_EXTENSION_AUTH',
        token: window.__RECAP_AUTH_TOKEN__,
        success: true
      });
      delete window.__RECAP_AUTH_TOKEN__;
    }
  };

  // Check immediately and also set up interval
  checkForToken();
  setInterval(checkForToken, 500);
})();

