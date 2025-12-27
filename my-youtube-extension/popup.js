// Popup script - handles UI interactions

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
  authButton: document.getElementById('authButton')
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
    return;
  }

  setButtonState('saving');

  try {
    const response = await chrome.runtime.sendMessage({ action: 'saveCurrentPage' });
    
    if (response.error) {
      // Check if it's an auth error
      if (response.error.includes('Unauthorized') || response.error.includes('sign in')) {
        showAuth();
        setButtonState('error', 'Please sign in to save');
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

// Initialize popup
async function init() {
  showLoading();

  // Extract page data first
  await extractPage();
  
  // Check auth status but don't block
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) {
    // Still show content, but button will prompt for auth
    console.log('Not authenticated - user will be prompted on save');
  }
}

// Event listeners
elements.saveButton.addEventListener('click', savePage);

elements.authButton.addEventListener('click', () => {
  // Open the main app for authentication
  chrome.tabs.create({ url: 'https://mvedoscvslmbieugxknd.lovableproject.com/' });
  window.close();
});

// Start
init();

