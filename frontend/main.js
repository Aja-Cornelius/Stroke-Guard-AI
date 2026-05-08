import './style.css'

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => console.log('🚀 StrokeGuard SW Registered:', reg.scope))
      .catch(err => console.error('❌ SW Registration Failed:', err));
  });
}

// PWA: Handle Installation Prompt
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

// PWA: Offline Detection
const offlineIndicator = document.getElementById('offline-indicator');

window.addEventListener('online', () => {
  offlineIndicator.classList.add('hidden');
  console.log('App is online');
});

window.addEventListener('offline', () => {
  offlineIndicator.classList.remove('hidden');
  console.log('App is offline');
});

const API_URL = 'http://localhost:8000';

const form = document.getElementById('risk-form');
const resultContainer = document.getElementById('result-container');
const formCard = document.querySelector('.form-card');
const loadingOverlay = document.getElementById('loading-overlay');
const submitBtn = document.getElementById('submit-btn');
const resetBtn = document.getElementById('reset-btn');

// Auth Elements
const authBtn = document.getElementById('auth-btn');
const logoutBtn = document.getElementById('logout-btn');
const userProfile = document.getElementById('user-profile');
const usernameDisplay = document.getElementById('username-display');
const authModal = document.getElementById('auth-modal');
const closeModal = document.getElementById('close-modal');
const authForm = document.getElementById('auth-form');
const authSubmit = document.getElementById('auth-submit');
const authSwitchBtn = document.getElementById('auth-switch-btn');
const modalTitle = document.getElementById('modal-title');
const authSwitchText = document.getElementById('auth-switch-text');

let isLoginMode = true;
let currentUser = JSON.parse(localStorage.getItem('stroke_guard_user'));

// Result Elements
const riskBadge = document.getElementById('risk-badge');
const gaugeFill = document.getElementById('gauge-fill');
const riskPercentage = document.getElementById('risk-percentage');
const riskAdvice = document.getElementById('risk-advice');
const explanationList = document.getElementById('explanation-list');
const riskGauge = document.querySelector('.risk-gauge');

// Initialize Auth UI
updateAuthUI();

// Auth Event Listeners
authBtn.addEventListener('click', () => {
  authModal.classList.remove('hidden');
});

closeModal.addEventListener('click', () => {
  authModal.classList.add('hidden');
});

authSwitchBtn.addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  modalTitle.textContent = isLoginMode ? 'Welcome Back' : 'Create Account';
  authSubmit.textContent = isLoginMode ? 'Sign In' : 'Register';
  authSwitchText.textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
  authSwitchBtn.textContent = isLoginMode ? 'Create one' : 'Sign in';
});

authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(authForm);
  const data = Object.fromEntries(formData.entries());
  
  // Mock Auth
  currentUser = { email: data.email, name: data.email.split('@')[0] };
  localStorage.setItem('stroke_guard_user', JSON.stringify(currentUser));
  
  updateAuthUI();
  authModal.classList.add('hidden');
  authForm.reset();
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('stroke_guard_user');
  currentUser = null;
  updateAuthUI();
});

function updateAuthUI() {
  if (currentUser) {
    authBtn.classList.add('hidden');
    userProfile.classList.remove('hidden');
    usernameDisplay.textContent = currentUser.name;
  } else {
    authBtn.classList.remove('hidden');
    userProfile.classList.add('hidden');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  // Convert numeric fields
  data.age = parseFloat(data.age);
  data.avg_glucose_level = parseFloat(data.avg_glucose_level);
  data.bmi = parseFloat(data.bmi);
  data.hypertension = parseInt(data.hypertension);
  data.heart_disease = parseInt(data.heart_disease);

  showLoading(true);

  try {
    const response = await fetch(`${API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Prediction failed');

    const result = await response.json();
    displayResults(result);
  } catch (error) {
    console.error(error);
    if (!navigator.onLine) {
      alert('You are currently offline. Please reconnect to use the AI Analysis Engine.');
    } else {
      alert('Error connecting to the AI Engine. Please ensure the backend is running.');
    }
  } finally {
    showLoading(false);
  }
});

resetBtn.addEventListener('click', () => {
  resultContainer.classList.add('hidden');
  formCard.classList.remove('hidden');
  form.reset();
});

function showLoading(show) {
  if (show) {
    loadingOverlay.classList.remove('hidden');
  } else {
    loadingOverlay.classList.add('hidden');
  }
}

function displayResults(data) {
  formCard.classList.add('hidden');
  resultContainer.classList.remove('hidden');

  const prob = data.risk_probability * 100;
  const level = data.risk_level;

  // Update Badge
  riskBadge.textContent = `${level} Risk`;
  riskBadge.className = `badge ${level.toLowerCase()}`;

  // Update Advice
  riskAdvice.textContent = data.advice || "No specific advice available.";

  // Update Gauge
  animateValue(riskPercentage, 0, prob, 1500);
  
  let color = 'var(--risk-low)';
  if (level === 'Moderate') color = 'var(--risk-moderate)';
  if (level === 'High') color = 'var(--risk-high)';
  
  riskGauge.style.background = `conic-gradient(${color} ${prob}%, #334155 ${prob}%)`;

  // Update Explanations
  explanationList.innerHTML = '';
  data.explanation.forEach(item => {
    const li = document.createElement('li');
    li.className = 'driver-item';
    
    const isPositive = item.contribution > 0;
    const impactText = isPositive ? 'Increases Risk' : 'Decreases Risk';
    const valueClass = isPositive ? 'positive' : 'negative';
    const sign = isPositive ? '+' : '';

    li.innerHTML = `
      <div class="driver-info">
        <span class="driver-name">${item.feature.replace(/cat__|num__|__/, '').replace('_', ' ')}</span>
        <span class="driver-impact">${impactText}</span>
      </div>
      <span class="driver-value ${valueClass}">${sign}${item.contribution.toFixed(4)}</span>
    `;
    explanationList.appendChild(li);
  });
}

function animateValue(obj, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const val = Math.floor(progress * (end - start) + start);
    obj.innerHTML = val + '%';
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}
