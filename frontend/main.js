import './style.css'

// ─── PWA Service Worker ───────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => console.log('🚀 StrokeGuard SW Registered:', reg.scope))
      .catch(err => console.error('❌ SW Registration Failed:', err));
  });
}

// PWA Install Prompt
let deferredPrompt;
const installBtn = document.getElementById('install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to install prompt: ${outcome}`);
  deferredPrompt = null;
  installBtn.classList.add('hidden');
});

// Offline Detection
const offlineIndicator = document.getElementById('offline-indicator');
window.addEventListener('online',  () => offlineIndicator.classList.add('hidden'));
window.addEventListener('offline', () => offlineIndicator.classList.remove('hidden'));

// ─── User State (Mock Auth with localStorage) ─────────────────────────────────
// Users are stored as: { email, name, passwordHash }[]
function getUsers() {
  return JSON.parse(localStorage.getItem('sg_users') || '[]');
}

function saveUsers(users) {
  localStorage.setItem('sg_users', JSON.stringify(users));
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('stroke_guard_user') || 'null');
}

function setCurrentUser(user) {
  localStorage.setItem('stroke_guard_user', JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem('stroke_guard_user');
}

// Simple hash (not cryptographic — demo purposes only)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

// ─── Auth Elements ────────────────────────────────────────────────────────────
const loginBtn       = document.getElementById('login-btn');
const registerBtn    = document.getElementById('register-btn');
const loggedOutDiv   = document.getElementById('logged-out-actions');
const userProfile    = document.getElementById('user-profile');
const usernameDisplay = document.getElementById('username-display');
const logoutBtn      = document.getElementById('logout-btn');
const authModal      = document.getElementById('auth-modal');
const closeModal     = document.getElementById('close-modal');
const authForm       = document.getElementById('auth-form');
const authSubmit     = document.getElementById('auth-submit');
const authSwitchBtn  = document.getElementById('auth-switch-btn');
const modalTitle     = document.getElementById('modal-title');
const authSwitchText = document.getElementById('auth-switch-text');
const authError      = document.getElementById('auth-error');
const nameGroup      = document.getElementById('name-group');
const regName        = document.getElementById('reg-name');

let isLoginMode = true;

// CTA Buttons that open assessment
const ctaStartBtn  = document.getElementById('cta-start-btn');
const ctaBottomBtn = document.getElementById('cta-bottom-btn');

// Initialise UI
updateAuthUI();

// ─── Open Modal Helpers ───────────────────────────────────────────────────────
function openLoginModal() {
  isLoginMode = true;
  syncModalMode();
  authModal.classList.remove('hidden');
  authForm.reset();
  clearAuthError();
}

function openRegisterModal() {
  isLoginMode = false;
  syncModalMode();
  authModal.classList.remove('hidden');
  authForm.reset();
  clearAuthError();
}

function syncModalMode() {
  if (isLoginMode) {
    modalTitle.textContent    = 'Welcome Back';
    authSubmit.textContent    = 'Sign In';
    authSwitchText.textContent = "Don't have an account?";
    authSwitchBtn.textContent  = 'Create one';
    nameGroup.classList.add('hidden');
    regName.removeAttribute('required');
  } else {
    modalTitle.textContent    = 'Create Account';
    authSubmit.textContent    = 'Register';
    authSwitchText.textContent = 'Already have an account?';
    authSwitchBtn.textContent  = 'Sign in';
    nameGroup.classList.remove('hidden');
    regName.setAttribute('required', 'true');
  }
}

function clearAuthError() {
  authError.classList.add('hidden');
  authError.textContent = '';
}

function showAuthError(msg) {
  authError.textContent = msg;
  authError.classList.remove('hidden');
}

// ─── Event Listeners ──────────────────────────────────────────────────────────
loginBtn.addEventListener('click', openLoginModal);
registerBtn.addEventListener('click', openRegisterModal);

closeModal.addEventListener('click', () => {
  authModal.classList.add('hidden');
  clearAuthError();
});

// Close modal on overlay click
authModal.addEventListener('click', (e) => {
  if (e.target === authModal) {
    authModal.classList.add('hidden');
    clearAuthError();
  }
});

authSwitchBtn.addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  syncModalMode();
  clearAuthError();
  authForm.reset();
});

// ─── Auth Form Submit ─────────────────────────────────────────────────────────
authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  clearAuthError();

  const email    = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;
  const users    = getUsers();
  const passwordHash = simpleHash(password);

  if (isLoginMode) {
    // LOGIN: find matching user
    const user = users.find(u => u.email === email && u.passwordHash === passwordHash);
    if (!user) {
      showAuthError('Incorrect email or password. Please try again or create an account.');
      return;
    }
    setCurrentUser({ email: user.email, name: user.name });
    authModal.classList.add('hidden');
    updateAuthUI();
    // Redirect to assessment
    window.location.href = '/assessment.html';

  } else {
    // REGISTER: check if email already used
    const existing = users.find(u => u.email === email);
    if (existing) {
      showAuthError('An account with this email already exists. Please sign in instead.');
      return;
    }
    const name = regName.value.trim() || email.split('@')[0];
    const newUser = { email, name, passwordHash };
    users.push(newUser);
    saveUsers(users);
    setCurrentUser({ email, name });
    authModal.classList.add('hidden');
    updateAuthUI();
    // Redirect to assessment
    window.location.href = '/assessment.html';
  }
});

// Logout
logoutBtn.addEventListener('click', () => {
  clearCurrentUser();
  updateAuthUI();
});

// ─── CTA Buttons ──────────────────────────────────────────────────────────────
function handleCtaClick() {
  const user = getCurrentUser();
  if (user) {
    // Already logged in → go straight to assessment
    window.location.href = '/assessment.html';
  } else {
    // Not logged in → open register modal
    openRegisterModal();
  }
}

ctaStartBtn.addEventListener('click', handleCtaClick);
ctaBottomBtn.addEventListener('click', handleCtaClick);

// ─── Update UI Based on Auth State ───────────────────────────────────────────
function updateAuthUI() {
  const user = getCurrentUser();
  if (user) {
    loggedOutDiv.classList.add('hidden');
    userProfile.classList.remove('hidden');
    usernameDisplay.textContent = `Hi, ${user.name}`;
  } else {
    loggedOutDiv.classList.remove('hidden');
    userProfile.classList.add('hidden');
  }
}

// ─── Smooth Scroll for Nav Links ──────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});
