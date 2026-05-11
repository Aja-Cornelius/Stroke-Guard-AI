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

const API_URL = 'https://stroke-guard-ai-1uhq.onrender.com';

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

// UI Elements
const genderSelector = document.querySelector('.gender-selector');
const formContainer = document.getElementById('form-container');
const maleSpecific = document.getElementById('male-specific');
const femaleSpecific = document.getElementById('female-specific');
const pregnancyOptions = document.getElementById('pregnancy-options');
const maleStress = document.getElementById('male-stress');
const backToGenderBtn = document.getElementById('back-to-gender');
const genderInput = document.getElementById('gender');

// Gender Selection Logic
document.getElementById('select-male').addEventListener('click', () => {
  setGender('Male');
});

document.getElementById('select-female').addEventListener('click', () => {
  setGender('Female');
});

function setGender(gender) {
  genderInput.value = gender;
  genderSelector.classList.add('hidden');
  formContainer.classList.remove('hidden');
  
  if (gender === 'Male') {
    maleSpecific.classList.remove('hidden');
    femaleSpecific.classList.add('hidden');
    maleStress.classList.remove('hidden');
  } else {
    femaleSpecific.classList.remove('hidden');
    maleSpecific.classList.add('hidden');
    maleStress.classList.add('hidden');
  }
}

backToGenderBtn.addEventListener('click', () => {
  formContainer.classList.add('hidden');
  genderSelector.classList.remove('hidden');
});

// Pregnancy Sub-menu Logic
document.getElementById('is_pregnant').addEventListener('change', (e) => {
  if (e.target.value === 'Yes') {
    pregnancyOptions.classList.remove('hidden');
  } else {
    pregnancyOptions.classList.add('hidden');
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  // Type conversion and calculations
  const numFields = ['age', 'weight', 'height', 'waist', 'systolic', 'diastolic', 'avg_glucose_level', 'total_cholesterol', 'sleep_hours', 'physical_activity', 'sodium_intake', 'hip_circumference', 'weeks_postpartum'];
  
  numFields.forEach(field => {
    if (data[field]) data[field] = parseFloat(data[field]);
    else data[field] = 0;
  });

  // Calculate BMI
  const heightMeters = data.height / 100;
  data.bmi = data.weight / (heightMeters * heightMeters);

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

function showLoading(show) {
  if (show) {
    loadingOverlay.classList.remove('hidden');
  } else {
    loadingOverlay.classList.add('hidden');
  }
}

function displayResults(data) {
  const analysisSection = document.getElementById('analysis');
  analysisSection.classList.add('hidden');
  resultContainer.classList.remove('hidden');

  // Update Report Date
  const reportDate = document.getElementById('report-date');
  reportDate.textContent = `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;

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

  // Generate Survival Guide
  generateSurvivalGuide(level);

  // Scroll to report
  resultContainer.scrollIntoView({ behavior: 'smooth' });
}

function generateSurvivalGuide(level) {
  const survivalContent = document.getElementById('survival-content');
  survivalContent.innerHTML = '';

  const commonTips = [
    { icon: '🥦', title: 'Healthy Diet', text: 'Reduce salt and saturated fats. Increase fruits and vegetables.' },
    { icon: '🏃', title: 'Regular Exercise', text: 'Aim for 30 mins of moderate activity most days.' },
    { icon: '🚭', title: 'Quit Smoking', text: 'Smoking significantly increases vascular risks.' }
  ];

  const highRiskTips = [
    { icon: '🚨', title: 'Immediate Medical Consultation', text: 'Consult a cardiologist immediately for a full assessment.', warning: true },
    { icon: '💊', title: 'Medication Adherence', text: 'If prescribed, never skip blood pressure or cholesterol medication.', warning: true },
    { icon: '📊', title: 'Monitor BP Daily', text: 'Keep a daily log of your blood pressure readings.', warning: true }
  ];

  const tips = level === 'High' ? [...highRiskTips, ...commonTips] : commonTips;

  tips.forEach(tip => {
    const card = document.createElement('div');
    card.className = `survival-card ${tip.warning ? 'warning' : ''}`;
    card.innerHTML = `
      <span class="icon">${tip.icon}</span>
      <div>
        <h4>${tip.title}</h4>
        <p class="small-text" style="margin: 0">${tip.text}</p>
      </div>
    `;
    survivalContent.appendChild(card);
  });
}

resetBtn.addEventListener('click', () => {
  resultContainer.classList.add('hidden');
  document.getElementById('analysis').classList.remove('hidden');
  form.reset();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

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

// Smooth Scroll for Nav Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth'
      });
    }
  });
});
