// Admin Dashboard Logic
document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  updateDate();
  loadStats();
});

function updateDate() {
  const dateElement = document.getElementById('current-date');
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  dateElement.textContent = new Date().toLocaleDateString('en-US', options);
}

function initCharts() {
  // 1. Risk Trend Chart (Line Chart)
  const riskTrendCtx = document.getElementById('riskTrendChart').getContext('2d');
  new Chart(riskTrendCtx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'High Risk',
          data: [45, 52, 48, 61, 55, 68],
          borderColor: '#ef4444',
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(239, 68, 68, 0.1)'
        },
        {
          label: 'Moderate Risk',
          data: [80, 75, 92, 88, 105, 110],
          borderColor: '#f59e0b',
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(245, 158, 11, 0.1)'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#94a3b8' } }
      },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      }
    }
  });

  // 2. Gender Distribution (Doughnut Chart)
  const genderCtx = document.getElementById('genderChart').getContext('2d');
  new Chart(genderCtx, {
    type: 'doughnut',
    data: {
      labels: ['Female', 'Male'],
      datasets: [{
        data: [58, 42],
        backgroundColor: ['#ec4899', '#3b82f6'],
        borderWidth: 0,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8' } }
      },
      cutout: '70%'
    }
  });
}

async function loadStats() {
  try {
    const response = await fetch('https://stroke-guard-ai-1uhq.onrender.com/stats');
    if (response.ok) {
      const data = await response.json();
      document.getElementById('total-assessments').textContent = data.total_predictions.toLocaleString();
      document.getElementById('high-risk-count').textContent = data.high_risk_count.toLocaleString();
      document.getElementById('model-accuracy').textContent = (data.accuracy * 100).toFixed(1) + '%';
    }
  } catch (error) {
    console.error('Failed to load live stats, using demo data.');
  }
}

// Navigation Logic
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    document.querySelector('.nav-item.active').classList.remove('active');
    e.currentTarget.classList.add('active');
  });
});
