import './style.css';
import './assessment.css';

const API_URL = 'https://stroke-guard-ai-1uhq.onrender.com';

// ─── Auth Guard ─────────────────────────────────────────────────────────────
const currentUser = JSON.parse(localStorage.getItem('stroke_guard_user'));

if (!currentUser) {
  // Not logged in → redirect to home where they can sign in / register
  alert('Please sign in or create an account to access the assessment.');
  window.location.href = '/';
}

// Show user name in header
const usernameDisplay = document.getElementById('username-display');
if (usernameDisplay && currentUser) {
  usernameDisplay.textContent = `Hi, ${currentUser.name}`;
}

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('stroke_guard_user');
  window.location.href = '/';
});

// ─── Step Navigation ────────────────────────────────────────────────────────
const stepGender  = document.getElementById('step-gender');
const stepForm    = document.getElementById('step-form');
const stepResults = document.getElementById('step-results');
const stepPills   = [
  document.getElementById('step-pill-1'),
  document.getElementById('step-pill-2'),
  document.getElementById('step-pill-3'),
];

function showStep(stepEl, pillIndex) {
  [stepGender, stepForm, stepResults].forEach(s => s.classList.add('hidden'));
  stepEl.classList.remove('hidden');
  stepEl.classList.add('active-step');
  stepPills.forEach((p, i) => {
    p.classList.toggle('active', i <= pillIndex);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Gender Selection ────────────────────────────────────────────────────────
const genderInput   = document.getElementById('gender');
const maleSpecific  = document.getElementById('male-specific');
const femaleSpecific = document.getElementById('female-specific');
const maleStress    = document.getElementById('male-stress');
const genderTag     = document.getElementById('gender-tag');

document.getElementById('select-male').addEventListener('click', () => setGender('Male'));
document.getElementById('select-female').addEventListener('click', () => setGender('Female'));

function setGender(gender) {
  genderInput.value = gender;
  genderTag.textContent = gender;

  if (gender === 'Male') {
    maleSpecific.classList.remove('hidden');
    femaleSpecific.classList.add('hidden');
    maleStress.classList.remove('hidden');
  } else {
    femaleSpecific.classList.remove('hidden');
    maleSpecific.classList.add('hidden');
    maleStress.classList.add('hidden');
  }

  showStep(stepForm, 1);
}

document.getElementById('back-to-gender').addEventListener('click', () => {
  showStep(stepGender, 0);
});

// ─── Height "Don't Know" Checkbox ────────────────────────────────────────────
const heightInput   = document.getElementById('height');
const heightUnknown = document.getElementById('height-unknown');

heightUnknown.addEventListener('change', () => {
  if (heightUnknown.checked) {
    heightInput.value = 170; // average default
    heightInput.disabled = true;
    heightInput.style.opacity = '0.4';
  } else {
    heightInput.value = '';
    heightInput.disabled = false;
    heightInput.style.opacity = '1';
  }
});

// ─── Pregnancy Sub-menu ───────────────────────────────────────────────────────
const pregnancyOptions = document.getElementById('pregnancy-options');
document.getElementById('is_pregnant').addEventListener('change', (e) => {
  if (e.target.value === 'Yes') {
    pregnancyOptions.classList.remove('hidden');
  } else {
    pregnancyOptions.classList.add('hidden');
  }
});

// ─── Form Submit ──────────────────────────────────────────────────────────────
const form          = document.getElementById('risk-form');
const loadingOverlay = document.getElementById('loading-overlay');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  // Numeric field conversion
  const numFields = [
    'age','weight','height','waist','systolic','diastolic',
    'avg_glucose_level','total_cholesterol','sleep_hours',
    'physical_activity','sodium_intake','hip_circumference','weeks_postpartum'
  ];

  numFields.forEach(field => {
    data[field] = data[field] ? parseFloat(data[field]) : 0;
  });

  // If height unknown, use default of 170
  if (!data.height || data.height === 0) data.height = 170;

  // BMI calculation
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
  loadingOverlay.classList.toggle('hidden', !show);
}

// ─── Display Results ──────────────────────────────────────────────────────────
function displayResults(data) {
  showStep(stepResults, 2);

  const reportDate      = document.getElementById('report-date');
  const riskBadge       = document.getElementById('risk-badge');
  const riskPercentage  = document.getElementById('risk-percentage');
  const riskAdvice      = document.getElementById('risk-advice');
  const explanationList = document.getElementById('explanation-list');
  const riskGauge       = document.querySelector('.risk-gauge');

  reportDate.textContent = `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;

  const prob  = data.risk_probability * 100;
  const level = data.risk_level;

  riskBadge.textContent = `${level} Risk`;
  riskBadge.className   = `badge ${level.toLowerCase()}`;
  riskAdvice.textContent = data.advice || 'No specific advice available.';

  // Animate gauge
  animateValue(riskPercentage, 0, prob, 1500);

  let color = 'var(--risk-low)';
  if (level === 'Moderate') color = 'var(--risk-moderate)';
  if (level === 'High')     color = 'var(--risk-high)';

  riskGauge.style.background = `conic-gradient(${color} ${prob}%, #334155 ${prob}%)`;

  // Explanations
  explanationList.innerHTML = '';
  data.explanation.forEach(item => {
    const li = document.createElement('li');
    li.className = 'driver-item';
    const isPositive  = item.contribution > 0;
    const impactText  = isPositive ? 'Increases Risk' : 'Decreases Risk';
    const valueClass  = isPositive ? 'positive' : 'negative';
    const sign        = isPositive ? '+' : '';
    li.innerHTML = `
      <div class="driver-info">
        <span class="driver-name">${item.feature.replace(/cat__|num__|__/, '').replace('_', ' ')}</span>
        <span class="driver-impact">${impactText}</span>
      </div>
      <span class="driver-value ${valueClass}">${sign}${item.contribution.toFixed(4)}</span>
    `;
    explanationList.appendChild(li);
  });

  generateSurvivalGuide(level);
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
    { icon: '🚨', title: 'Immediate Consultation', text: 'Consult a cardiologist immediately for a full assessment.', warning: true },
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

document.getElementById('reset-btn').addEventListener('click', () => {
  form.reset();
  heightInput.disabled = false;
  heightInput.style.opacity = '1';
  heightUnknown.checked = false;
  showStep(stepGender, 0);
});

function animateValue(obj, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const val = Math.floor(progress * (end - start) + start);
    obj.innerHTML = val + '%';
    if (progress < 1) window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
}

// ─── Offline Detection ────────────────────────────────────────────────────────
const offlineIndicator = document.getElementById('offline-indicator');
window.addEventListener('online',  () => offlineIndicator.classList.add('hidden'));
window.addEventListener('offline', () => offlineIndicator.classList.remove('hidden'));
