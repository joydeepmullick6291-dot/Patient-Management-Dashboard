/* ============================================================
   Tech.Care Dashboard — app.js
   ============================================================ */

'use strict';

/* ---------- Helpers ---------- */
const $ = id => document.getElementById(id);
const API_URL = 'https://fedskillstest.coalitiontechnologies.workers.dev';
const API_CREDS = btoa('coalition:skills-test');

let bpChart = null;
let allHistory = []; // newest first, as returned by API

/* ---------- Badge helpers ---------- */
function statusClass(s) {
  if (!s) return 'status-badge s-default';
  const l = s.toLowerCase();
  if (l.includes('under') || l.includes('observation')) return 'status-badge s-under';
  if (l.includes('cured'))    return 'status-badge s-cured';
  if (l.includes('inactive')) return 'status-badge s-inactive';
  if (l.includes('normal'))   return 'status-badge s-normal';
  if (l.includes('critical')) return 'status-badge s-critical';
  return 'status-badge s-default';
}

function trendArrow(level, colorClass) {
  if (!level) return '';
  const l = level.toLowerCase();
  if (l.includes('higher') || l.includes('above') || l.includes('tachycardia') || l.includes('elevated'))
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="${colorClass}"><polyline points="18 15 12 9 6 15"/></svg>`;
  if (l.includes('lower') || l.includes('below') || l.includes('bradycardia'))
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="${colorClass}"><polyline points="6 9 12 15 18 9"/></svg>`;
  return '';
}

/* ---------- Chart ---------- */
function buildChart(range) {
  // allHistory is newest-first → slice then reverse for chronological display
  let hist;
  if (range === 'all') {
    hist = [...allHistory].reverse();
  } else {
    hist = [...allHistory].slice(0, parseInt(range)).reverse();
  }

  const labels = hist.map(d => {
    const mon = d.month ? d.month.slice(0, 3) : '';
    return `${mon}, ${d.year}`;
  });
  const systolic  = hist.map(d => d.blood_pressure?.systolic?.value  ?? null);
  const diastolic = hist.map(d => d.blood_pressure?.diastolic?.value ?? null);

  if (bpChart) {
    bpChart.data.labels              = labels;
    bpChart.data.datasets[0].data   = systolic;
    bpChart.data.datasets[1].data   = diastolic;
    bpChart.update('active');
    return;
  }

  const ctx = document.getElementById('bpChart').getContext('2d');
  bpChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Systolic',
          data: systolic,
          borderColor: '#E040A2',
          backgroundColor: 'rgba(224,64,162,.12)',
          borderWidth: 2.5,
          tension: 0.45,
          pointBackgroundColor: '#E040A2',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          fill: false,
        },
        {
          label: 'Diastolic',
          data: diastolic,
          borderColor: '#6C63FF',
          backgroundColor: 'rgba(108,99,255,.08)',
          borderWidth: 2.5,
          tension: 0.45,
          pointBackgroundColor: '#6C63FF',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          fill: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1c1e',
          titleColor: '#fff',
          bodyColor: '#c8cbd3',
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} mmHg`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: '#9ca3af', font: { size: 11, family: 'Manrope' } }
        },
        y: {
          min: 60,
          grid: { color: 'rgba(0,0,0,.05)' },
          border: { display: false },
          ticks: { color: '#9ca3af', font: { size: 11, family: 'Manrope' }, stepSize: 20 }
        }
      }
    }
  });
}

/* ---------- Populate Patient List ---------- */
function populatePatients(patients) {
  const list = $('patient-list');
  list.innerHTML = patients.map((p, i) => {
    const active = p.name === 'Jessica Taylor' ? 'active' : '';
    const avatar = p.profile_picture || `https://i.pravatar.cc/88?img=${i + 2}`;
    return `
      <li class="patient-item ${active}">
        <img class="patient-avatar" src="${avatar}" alt="${p.name}" width="44" height="44" loading="lazy"
          onerror="this.src='https://i.pravatar.cc/88?img=${i + 2}'"/>
        <div class="patient-info">
          <div class="patient-name">${p.name}</div>
          <div class="patient-meta">${p.gender || ''}, ${p.age || ''}</div>
        </div>
        <span class="patient-more">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
        </span>
      </li>`;
  }).join('');
}

/* ---------- Populate Profile ---------- */
function populateProfile(j) {
  // Avatar & name
  const photo = $('profile-photo');
  photo.src = j.profile_picture || 'https://i.pravatar.cc/220?img=47';
  photo.alt = j.name;
  $('profile-name').textContent = j.name;

  // Info rows
  const fields = [
    { icon: calIcon(), key: 'Date Of Birth', val: j.date_of_birth },
    { icon: genderIcon(), key: 'Gender', val: j.gender },
    { icon: phoneIcon(), key: 'Contact Info.', val: j.phone_number },
    { icon: phoneIcon(), key: 'Emergency Contacts', val: j.emergency_contact },
    { icon: shieldIcon(), key: 'Insurance Provider', val: j.insurance_type },
  ];
  $('profile-info').innerHTML = fields.map(f => `
    <li class="profile-info-item">
      <div class="pi-icon">${f.icon}</div>
      <div>
        <div class="pi-key">${f.key}</div>
        <div class="pi-val">${f.val || '—'}</div>
      </div>
    </li>`).join('');
}

/* ---------- Populate Vitals ---------- */
function populateVitals(latest) {
  if (!latest) return;
  const hr  = latest.heart_rate;
  const rr  = latest.respiratory_rate;
  const tmp = latest.temperature;
  const s   = latest.blood_pressure?.systolic;
  const d   = latest.blood_pressure?.diastolic;

  // Respiratory
  $('v-resp-val').textContent   = `${rr?.value ?? '—'} bpm`;
  $('v-resp-status').innerHTML  = `${trendArrow(rr?.levels, '')} ${rr?.levels || 'Normal'}`;

  // Temperature
  $('v-temp-val').textContent   = `${tmp?.value ?? '—'}°F`;
  $('v-temp-status').innerHTML  = `${trendArrow(tmp?.levels, '')} ${tmp?.levels || 'Normal'}`;

  // Heart Rate
  $('v-heart-val').textContent  = `${hr?.value ?? '—'} bpm`;
  $('v-heart-status').innerHTML = `${trendArrow(hr?.levels, 'trend-dn')} ${hr?.levels || 'Normal'}`;

  // BP stats panel
  $('stat-syst').textContent    = s?.value ?? '—';
  $('stat-diast').textContent   = d?.value ?? '—';
  $('stat-syst-trend').innerHTML  = `${trendArrow(s?.levels, 'trend-up')} ${s?.levels || ''}`;
  $('stat-diast-trend').innerHTML = `${trendArrow(d?.levels, 'trend-dn')} ${d?.levels || ''}`;
}

/* ---------- Populate Diagnostics ---------- */
function populateDiagnostics(list) {
  $('diag-tbody').innerHTML = (list || []).map(d => `
    <tr>
      <td class="diag-name">${d.name || '—'}</td>
      <td class="diag-desc">${d.description || '—'}</td>
      <td><span class="${statusClass(d.status)}">${d.status || '—'}</span></td>
    </tr>`).join('');
}

/* ---------- Populate Lab Results ---------- */
function populateLabs(labs) {
  $('lab-list').innerHTML = (labs || []).map(l => `
    <li class="lab-item">
      <span>${l}</span>
      <button class="lab-download" aria-label="Download ${l}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </button>
    </li>`).join('');
}

/* ---------- SVG icon helpers ---------- */
function calIcon() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
}
function genderIcon() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M3 21c0-4 4-7 9-7s9 3 9 7"/></svg>`;
}
function phoneIcon() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.61 19a19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
}
function shieldIcon() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
}

/* ---------- Vital SVG icons (inline, matching XD) ---------- */
function injectVitalIcons() {
  // Respiratory — lungs
  $('icon-resp').innerHTML = `<svg width="38" height="38" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 12 C32 12 32 32 32 40" stroke="#4A90D9" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M32 40 C32 40 20 40 16 50 C12 60 20 62 24 58 C26 56 26 50 28 48" stroke="#4A90D9" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M32 40 C32 40 44 40 48 50 C52 60 44 62 40 58 C38 56 38 50 36 48" stroke="#4A90D9" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M28 20 C28 20 18 22 16 32 C14 38 18 42 22 40 C26 38 28 32 28 28" stroke="#4A90D9" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <path d="M36 20 C36 20 46 22 48 32 C50 38 46 42 42 40 C38 38 36 32 36 28" stroke="#4A90D9" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  </svg>`;

  // Temperature — thermometer
  $('icon-temp').innerHTML = `<svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="27" y="10" width="10" height="30" rx="5" fill="#FF6B6B" opacity=".25"/>
    <rect x="29" y="16" width="6" height="24" rx="3" fill="#FF6B6B"/>
    <circle cx="32" cy="48" r="9" fill="#FF6B6B"/>
    <rect x="29" y="24" width="6" height="24" rx="0" fill="#FF6B6B"/>
  </svg>`;

  // Heart Rate — heart with pulse
  $('icon-heart').innerHTML = `<svg width="38" height="38" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 52 C32 52 10 38 10 24 C10 16 16 10 24 12 C28 13 30 16 32 20 C34 16 36 13 40 12 C48 10 54 16 54 24 C54 38 32 52 32 52Z" fill="#FF6B6B" opacity=".8"/>
    <polyline points="14,32 20,32 23,26 26,38 29,30 32,34 35,30 40,32 50,32" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`;
}

/* ---------- Main: Fetch & Render ---------- */
async function init() {
  const overlay = $('loading');
  const errEl   = $('err');

  try {
    const res = await fetch(API_URL, {
      headers: { Authorization: 'Basic ' + API_CREDS }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const data = await res.json();

    // Populate patient list (all patients)
    populatePatients(data);

    // Find Jessica Taylor
    const jessica = data.find(p => p.name === 'Jessica Taylor');
    if (!jessica) throw new Error('Jessica Taylor not found in API response');

    // Store history for chart filtering
    allHistory = jessica.diagnosis_history || [];

    // Populate all sections
    populateProfile(jessica);
    populateVitals(allHistory[0]); // most recent entry
    populateDiagnostics(jessica.diagnostic_list);
    populateLabs(jessica.lab_results);

    // Build Chart.js blood pressure chart (default: last 6 months)
    buildChart('6');

    // Month range selector
    $('bp-range').addEventListener('change', e => buildChart(e.target.value));

  } catch (e) {
    console.error(e);
    errEl.textContent = '⚠️ Failed to load patient data: ' + e.message;
    errEl.style.display = 'block';
  } finally {
    overlay.style.display = 'none';
    injectVitalIcons();
  }
}

document.addEventListener('DOMContentLoaded', init);
