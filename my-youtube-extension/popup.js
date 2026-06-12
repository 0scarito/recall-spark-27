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

// UI helpers
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

function updatePageInfo(data) {
  const title = data.metadata?.title || data.title || 'Untitled Page';
  const url = data.sourceUrl || data.url || '';
  
  elements.pageTitle.textContent = title;
  try {
    elements.pageUrl.textContent = new URL(url).hostname;
  } catch (e) {
    elements.pageUrl.textContent = url;
  }

  if (data.isYouTube) {
    elements.pageType.innerHTML = '🎥 YouTube Video';
    elements.transcriptStatus.style.display = 'flex';
    
    if (data.hasFullTranscript) {
      elements.transcriptStatus.className = 'transcript-status success';
      elements.transcriptStatus.innerHTML = `✓ Transcript available (${data.transcriptSource})`;
    } else {
      elements.transcriptStatus.className = 'transcript-status warning';
      elements.transcriptStatus.innerHTML = `⚠ ${data.transcriptError || 'No transcript found'}`;
    }
  } else {
    elements.pageType.innerHTML = '📄 Web Page';
    elements.transcriptStatus.style.display = 'none';
  }
}

function setButtonState(state, message = '') {
  const states = {
    ready: { disabled: false, className: 'save-button', icon: '💾', text: 'Save & Summarize' },
    saving: { disabled: true, className: 'save-button', icon: '⏳', text: 'Saving...' },
    success: { disabled: true, className: 'save-button success', icon: '✓', text: 'Saved!' },
    error: { disabled: false, className: 'save-button error', icon: '✕', text: 'Try Again' }
  };
  
  const config = states[state] || states.ready;
  elements.saveButton.disabled = config.disabled;
  elements.saveButton.className = config.className;
  elements.saveIcon.textContent = config.icon;
  elements.saveText.textContent = config.text;
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = state === 'error' ? 'status-message error' : 'status-message';
}

// Core functionality
async function extractPage() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'extractCurrentPage' });
    
    if (response.error) throw new Error(response.error);
    
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

async function savePage() {
  if (!extractedData) return;

  const isAuth = await checkAuth();
  if (!isAuth) {
    showAuth();
    elements.authStatus.textContent = 'Please sign in to save';
    return;
  }

  setButtonState('saving');

  try {
    const response = await chrome.runtime.sendMessage({ action: 'saveCurrentPage' });
    
    if (response.error) {
      if (response.needsAuth || response.error.includes('Unauthorized')) {
        showAuth();
        elements.authStatus.textContent = 'Session expired. Please sign in again.';
        return;
      }
      throw new Error(response.error);
    }

    setButtonState('success', 'Saved to your library');
    setTimeout(() => window.close(), 1500);
  } catch (error) {
    console.error('Save error:', error);
    setButtonState('error', error.message || 'Failed to save');
  }
}

async function checkAuth() {
  const response = await chrome.runtime.sendMessage({ action: 'checkAuth' });
  return response.isAuthenticated;
}

async function authenticate() {
  elements.authStatus.textContent = 'Opening sign-in page...';
  elements.authButton.disabled = true;

  try {
    // Open auth page - content-auth.js will handle token capture
    await chrome.tabs.create({
      url: `${APP_URL}/extension-auth?extension=true`,
      active: true
    });

    // Close popup - user will complete auth in new tab
    // When they're done, content-auth.js sends token to background
    // Next time they open popup, they'll be authenticated
    window.close();
  } catch (error) {
    console.error('Auth error:', error);
    elements.authStatus.textContent = 'Failed to open sign-in page';
    elements.authButton.disabled = false;
  }
}

// Initialize
async function init() {
  showLoading();

  const isAuth = await checkAuth();
  elements.authStatus.textContent = isAuth ? '✓ Signed in' : 'Not signed in';
  elements.authStatus.className = isAuth ? 'auth-status authenticated' : 'auth-status';

  await extractPage();
}

// Event listeners
elements.saveButton.addEventListener('click', savePage);
elements.authButton.addEventListener('click', authenticate);

init();
