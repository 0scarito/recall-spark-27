// Popup script - handles UI interactions

const APP_URL = 'https://recall-spark-27.lovable.app';

const elements = {
  loading: document.getElementById('loading'),
  content: document.getElementById('content'),
  authSection: document.getElementById('authSection'),
  pageTitle: document.getElementById('pageTitle'),
  pageUrl: document.getElementById('pageUrl'),
  pageType: document.getElementById('pageType'),
  transcriptStatus: document.getElementById('transcriptStatus'),
  saveButton: document.getElementById('saveButton'),
  saveIcon: document.getElementById('saveIcon'),
  saveText: document.getElementById('saveText'),
  statusMessage: document.getElementById('statusMessage'),
  authButton: document.getElementById('authButton'),
  authStatus: document.getElementById('authStatus')
};

let extractedData = null;

// Show/hide sections
function showLoading() {
  elements.loading.style.display = 'flex';
  elements.content.style.display = 'none';
  elements.authSection.style.display = 'none';
}

function showContent() {
  elements.loading.style.display = 'none';
  elements.content.style.display = 'block';
  elements.authSection.style.display = 'none';
}

function showAuth() {
  elements.loading.style.display = 'none';
  elements.content.style.display = 'none';
  elements.authSection.style.display = 'block';
}

// Update page info display
function updatePageInfo(data) {
  const title = data.metadata?.title || data.title || 'Untitled Page';
  const url = data.sourceUrl || data.url || '';
  
  elements.pageTitle.textContent = title;
  elements.pageUrl.textContent = new URL(url).hostname;

  if (data.isYouTube) {
    elements.pageType.innerHTML = '🎥 YouTube Video';
    
    // Show transcript status
    elements.transcriptStatus.style.display = 'flex';
    if (data.hasFullTranscript) {
      elements.transcriptStatus.className = 'transcript-status success';
      elements.transcriptStatus.innerHTML = `✓ Transcript available (${data.transcriptSource})`;
    } else {
      elements.transcriptStatus.className = 'transcript-status warning';
      const errorMsg = data.transcriptError || 'No transcript found';
      elements.transcriptStatus.innerHTML = `⚠ ${errorMsg}`;
    }
  } else {
    elements.pageType.innerHTML = '📄 Web Page';
    elements.transcriptStatus.style.display = 'none';
  }
}

// Update button state
function setButtonState(state, message) {
  switch (state) {
    case 'ready':
      elements.saveButton.disabled = false;
      elements.saveButton.className = 'save-button';
      elements.saveIcon.textContent = '💾';
      elements.saveText.textContent = 'Save & Summarize';
      break;
    case 'saving':
      elements.saveButton.disabled = true;
      elements.saveIcon.textContent = '⏳';
      elements.saveText.textContent = 'Saving...';
      break;
    case 'success':
      elements.saveButton.disabled = true;
      elements.saveButton.className = 'save-button success';
      elements.saveIcon.textContent = '✓';
      elements.saveText.textContent = 'Saved!';
      break;
    case 'error':
      elements.saveButton.disabled = false;
      elements.saveButton.className = 'save-button error';
      elements.saveIcon.textContent = '✕';
      elements.saveText.textContent = 'Try Again';
      break;
  }
  
  elements.statusMessage.textContent = message || '';
  elements.statusMessage.className = state === 'error' ? 'status-message error' : 'status-message';
}

// Extract page data
async function extractPage() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'extractCurrentPage' });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    extractedData = response;
    updatePageInfo(response);
    showContent();
    setButtonState('ready');
  } catch (error) {
    console.error('Extract error:', error);
    showContent();
    elements.pageTitle.textContent = 'Unable to extract page';
    elements.pageUrl.textContent = error.message;
    setButtonState('error', 'Could not read this page');
  }
}

// Save page
async function savePage() {
  if (!extractedData) return;

  // Check authentication first
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) {
    showAuth();
    setButtonState('error', 'Please sign in to save');
    elements.authStatus.textContent = 'Click the button above to sign in';
    return;
  }

  setButtonState('saving');

  try {
    const response = await chrome.runtime.sendMessage({ action: 'saveCurrentPage' });
    
    if (response.error) {
      // Check if it's an auth error
      if (response.error.includes('Unauthorized') || response.error.includes('sign in') || response.needsAuth) {
        showAuth();
        setButtonState('error', 'Please sign in to save');
        elements.authStatus.textContent = 'Your session may have expired. Please sign in again.';
        return;
      }
      throw new Error(response.error);
    }

    setButtonState('success', 'Saved to your library');
    
    // Close popup after success
    setTimeout(() => window.close(), 1500);
  } catch (error) {
    console.error('Save error:', error);
    const errorMsg = error.message || 'Failed to save';
    if (errorMsg.includes('Unauthorized') || errorMsg.includes('sign in')) {
      showAuth();
      setButtonState('error', 'Please sign in to save');
      elements.authStatus.textContent = 'Your session may have expired. Please sign in again.';
    } else {
      setButtonState('error', errorMsg);
    }
  }
}

// Check authentication
async function checkAuth() {
  const response = await chrome.runtime.sendMessage({ action: 'checkAuth' });
  return response.isAuthenticated;
}

// Authenticate with app
async function authenticate() {
  elements.authStatus.textContent = 'Opening sign-in page...';
  elements.authButton.disabled = true;

  try {
    // Open auth page
    const authTab = await chrome.tabs.create({
      url: `${APP_URL}/extension-auth?extension=true`,
      active: true
    });

    // Listen for messages from the auth page
    const messageListener = async (message, sender, sendResponse) => {
      if (message.type === 'RECAP_EXTENSION_AUTH' && message.success) {
        // Store the token
        await chrome.runtime.sendMessage({
          action: 'setAuthToken',
          token: message.token
        });

        // Close the auth tab
        chrome.tabs.remove(authTab.id);

        // Update UI
        elements.authStatus.textContent = '✓ Authenticated!';
        elements.authStatus.className = 'auth-status authenticated';
        
        // Remove listener
        chrome.runtime.onMessage.removeListener(messageListener);
        
        // Reload to show content
        setTimeout(() => {
          init();
        }, 500);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Also listen for window messages (postMessage from the page)
    window.addEventListener('message', (event) => {
      if (event.origin !== APP_URL) return;
      
      if (event.data.type === 'RECAP_EXTENSION_AUTH' && event.data.success) {
        chrome.runtime.sendMessage({
          action: 'setAuthToken',
          token: event.data.token
        }).then(() => {
          chrome.tabs.remove(authTab.id);
          elements.authStatus.textContent = '✓ Authenticated!';
          elements.authStatus.className = 'auth-status authenticated';
          setTimeout(() => {
            init();
          }, 500);
        });
      }
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(messageListener);
      elements.authButton.disabled = false;
      elements.authStatus.textContent = 'Authentication timeout. Please try again.';
    }, 300000);

  } catch (error) {
    console.error('Auth error:', error);
    elements.authStatus.textContent = 'Failed to open sign-in page. Please try again.';
    elements.authButton.disabled = false;
  }
}

// Initialize popup
async function init() {
  showLoading();

  // Check auth status
  const isAuthenticated = await checkAuth();
  
  if (isAuthenticated) {
    elements.authStatus.textContent = '✓ Signed in';
    elements.authStatus.className = 'auth-status authenticated';
  } else {
    elements.authStatus.textContent = 'Not signed in';
    elements.authStatus.className = 'auth-status';
  }

  // Extract page data
  await extractPage();
}

// Event listeners
elements.saveButton.addEventListener('click', savePage);
elements.authButton.addEventListener('click', authenticate);

// Start
init();
