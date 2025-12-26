// Popup script - handles UI and authentication

// Supabase configuration
const SUPABASE_URL = 'https://mvedoscvslmbieugxknd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12ZWRvc2N2c2xtYmlldWd4a25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMzQxOTAsImV4cCI6MjA3NzgxMDE5MH0.vVztPm4EwISXC9wpbdF-Jg7TSxHILxIEk1sc-IaYPps';
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
  userInfo: document.getElementById('userInfo'),
  userEmail: document.getElementById('userEmail'),
  logoutBtn: document.getElementById('logoutBtn'),
  loginTab: document.getElementById('loginTab'),
  signupTab: document.getElementById('signupTab'),
  authForm: document.getElementById('authForm'),
  authSubmit: document.getElementById('authSubmit'),
  authError: document.getElementById('authError'),
  authSuccess: document.getElementById('authSuccess'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  openAppLink: document.getElementById('openAppLink')
};

let extractedData = null;
let currentUser = null;
let isLoginMode = true;

// ============ Auth Functions ============

async function supabaseRequest(endpoint, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1${endpoint}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error_description || data.msg || data.error || 'Request failed');
  }
  
  return data;
}

async function signIn(email, password) {
  const data = await supabaseRequest('/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  // Store tokens
  await chrome.storage.local.set({
    supabase_access_token: data.access_token,
    supabase_refresh_token: data.refresh_token,
    supabase_user: data.user
  });
  
  return data;
}

async function signUp(email, password) {
  const data = await supabaseRequest('/signup', {
    method: 'POST',
    body: JSON.stringify({ 
      email, 
      password,
      data: {}
    })
  });
  
  // If email confirmation is disabled, user is already signed in
  if (data.access_token) {
    await chrome.storage.local.set({
      supabase_access_token: data.access_token,
      supabase_refresh_token: data.refresh_token,
      supabase_user: data.user
    });
  }
  
  return data;
}

async function signOut() {
  const { supabase_access_token } = await chrome.storage.local.get(['supabase_access_token']);
  
  if (supabase_access_token) {
    try {
      await supabaseRequest('/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase_access_token}`
        }
      });
    } catch (e) {
      console.log('Logout request failed, clearing local state anyway');
    }
  }
  
  await chrome.storage.local.remove([
    'supabase_access_token',
    'supabase_refresh_token', 
    'supabase_user'
  ]);
  
  currentUser = null;
}

async function refreshSession() {
  const { supabase_refresh_token } = await chrome.storage.local.get(['supabase_refresh_token']);
  
  if (!supabase_refresh_token) {
    return null;
  }
  
  try {
    const data = await supabaseRequest('/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: supabase_refresh_token })
    });
    
    await chrome.storage.local.set({
      supabase_access_token: data.access_token,
      supabase_refresh_token: data.refresh_token,
      supabase_user: data.user
    });
    
    return data;
  } catch (e) {
    console.error('Session refresh failed:', e);
    await chrome.storage.local.remove([
      'supabase_access_token',
      'supabase_refresh_token',
      'supabase_user'
    ]);
    return null;
  }
}

async function getCurrentUser() {
  const { supabase_access_token, supabase_user } = await chrome.storage.local.get([
    'supabase_access_token',
    'supabase_user'
  ]);
  
  if (!supabase_access_token) {
    return null;
  }
  
  // Verify token is still valid
  try {
    const data = await supabaseRequest('/user', {
      headers: {
        'Authorization': `Bearer ${supabase_access_token}`
      }
    });
    return data;
  } catch (e) {
    // Token might be expired, try refreshing
    const refreshed = await refreshSession();
    return refreshed?.user || null;
  }
}

// ============ UI Functions ============

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
  elements.authError.style.display = 'none';
  elements.authSuccess.style.display = 'none';
}

function updateUserInfo(user) {
  if (user) {
    elements.userInfo.style.display = 'flex';
    elements.userEmail.textContent = user.email.split('@')[0];
  } else {
    elements.userInfo.style.display = 'none';
  }
}

function setAuthMode(login) {
  isLoginMode = login;
  elements.loginTab.classList.toggle('active', login);
  elements.signupTab.classList.toggle('active', !login);
  elements.authSubmit.textContent = login ? 'Sign In' : 'Sign Up';
  elements.authError.style.display = 'none';
  elements.authSuccess.style.display = 'none';
}

function showAuthError(message) {
  elements.authError.textContent = message;
  elements.authError.style.display = 'block';
  elements.authSuccess.style.display = 'none';
}

function showAuthSuccess(message) {
  elements.authSuccess.textContent = message;
  elements.authSuccess.style.display = 'block';
  elements.authError.style.display = 'none';
}

function updatePageInfo(data) {
  const title = data.metadata?.title || data.title || 'Untitled Page';
  const url = data.sourceUrl || data.url || '';
  
  elements.pageTitle.textContent = title;
  try {
    elements.pageUrl.textContent = new URL(url).hostname;
  } catch {
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
      elements.transcriptStatus.innerHTML = '⚠ No transcript found';
    }
  } else {
    elements.pageType.innerHTML = '📄 Web Page';
    elements.transcriptStatus.style.display = 'none';
  }
}

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

// ============ Page Functions ============

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

async function savePage() {
  if (!extractedData) return;

  setButtonState('saving');

  try {
    // Get fresh token
    const { supabase_access_token } = await chrome.storage.local.get(['supabase_access_token']);
    
    if (!supabase_access_token) {
      throw new Error('Please sign in first');
    }
    
    // Send directly to edge function with auth token
    const response = await fetch(`${SUPABASE_URL}/functions/v1/save-from-extension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabase_access_token}`
      },
      body: JSON.stringify(extractedData)
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to save');
    }

    setButtonState('success', 'Saved to your library');
    
    setTimeout(() => window.close(), 1500);
  } catch (error) {
    console.error('Save error:', error);
    
    if (error.message.includes('sign in') || error.message.includes('Unauthorized')) {
      // Token expired, show auth
      currentUser = null;
      showAuth();
    } else {
      setButtonState('error', error.message);
    }
  }
}

// ============ Event Handlers ============

elements.loginTab.addEventListener('click', () => setAuthMode(true));
elements.signupTab.addEventListener('click', () => setAuthMode(false));

elements.authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = elements.email.value.trim();
  const password = elements.password.value;
  
  if (!email || !password) {
    showAuthError('Please enter email and password');
    return;
  }
  
  if (password.length < 6) {
    showAuthError('Password must be at least 6 characters');
    return;
  }
  
  elements.authSubmit.disabled = true;
  elements.authSubmit.textContent = isLoginMode ? 'Signing in...' : 'Creating account...';
  
  try {
    if (isLoginMode) {
      const data = await signIn(email, password);
      currentUser = data.user;
      updateUserInfo(currentUser);
      await extractPage();
    } else {
      const data = await signUp(email, password);
      
      if (data.access_token) {
        // Auto-confirmed signup
        currentUser = data.user;
        updateUserInfo(currentUser);
        await extractPage();
      } else {
        // Email confirmation required
        showAuthSuccess('Check your email to confirm your account');
        elements.authSubmit.disabled = false;
        elements.authSubmit.textContent = 'Sign Up';
      }
    }
  } catch (error) {
    console.error('Auth error:', error);
    showAuthError(error.message);
    elements.authSubmit.disabled = false;
    elements.authSubmit.textContent = isLoginMode ? 'Sign In' : 'Sign Up';
  }
});

elements.logoutBtn.addEventListener('click', async () => {
  await signOut();
  updateUserInfo(null);
  showAuth();
});

elements.saveButton.addEventListener('click', savePage);

elements.openAppLink.addEventListener('click', () => {
  chrome.tabs.create({ url: APP_URL });
  window.close();
});

// ============ Initialize ============

async function init() {
  showLoading();
  
  try {
    currentUser = await getCurrentUser();
    
    if (currentUser) {
      updateUserInfo(currentUser);
      await extractPage();
    } else {
      showAuth();
    }
  } catch (error) {
    console.error('Init error:', error);
    showAuth();
  }
}

init();