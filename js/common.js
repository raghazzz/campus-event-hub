// ============ Shared helpers used by every page ============

const API_URL = 'api/';

// ---- Fetch JSON from a URL (data files or PHP API) ----
async function getJSON(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({ ok: false, error: 'Server did not return JSON.' }));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Send a JS object to the API as JSON.
function postJSON(url, body) {
  return getJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// Load the JSON data files. If fetch() is blocked (the page was opened by
// double-clicking it, so the URL starts with file://), use the copies in data/fallback.js.
async function loadData(file, fallback) {
  try {
    return await getJSON('data/' + file);
  } catch {
    if (Array.isArray(fallback)) return fallback;
    throw new Error('Could not load ' + file);
  }
}
const loadEvents = () => loadData('events.json', window.FALLBACK_EVENTS);
const loadClubs  = () => loadData('clubs.json', window.FALLBACK_CLUBS);

// ============ Backend detection + demo mode ============
// The site first tries the PHP API. If PHP isn't there at all (file:// pages, or a
// static host like GitHub Pages that serves .php files as plain text), the site
// switches to DEMO MODE: everything still works, but registrations are saved in
// this browser's localStorage instead of MySQL.
let backendCheck = null;

function hasBackend() {
  if (!backendCheck) {
    backendCheck = fetch(API_URL + 'counts.php')
      .then(res => res.json().then(data => typeof data === 'object' && 'ok' in data, () => false))
      .catch(() => false);
  }
  return backendCheck;
}

const DEMO_KEY = 'campushub-demo-registrations';

const demoStore = {
  // Sample rows (same as database.sql) plus anything registered in this browser.
  all() {
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(DEMO_KEY)) || []; } catch {}
    const removed = new Set(saved.filter(r => r.removed).map(r => r.id));
    const sample = (window.FALLBACK_REGISTRATIONS || []).filter(r => !removed.has(r.id));
    return [...saved.filter(r => !r.removed), ...sample];
  },
  saveRaw(list) {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(list)); return true; } catch { return false; }
  },
  raw() {
    try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || []; } catch { return []; }
  },
  add(reg) {
    const list = this.raw();
    const nextId = Math.max(5, ...this.all().map(r => r.id), ...list.map(r => r.id)) + 1;
    const row = { id: nextId, ...reg, registered_at: new Date().toISOString().slice(0, 19).replace('T', ' ') };
    list.unshift(row);
    this.saveRaw(list);
    return row;
  },
  remove(id) {
    const list = this.raw().filter(r => r.id !== id);
    const isSample = (window.FALLBACK_REGISTRATIONS || []).some(r => r.id === id);
    if (isSample) list.push({ id, removed: true }); // remember deleted sample rows
    this.saveRaw(list);
  },
  counts() {
    return this.all().reduce((acc, r) => { acc[r.event_id] = (acc[r.event_id] || 0) + 1; return acc; }, {});
  }
};

// Registration counts per event: from MySQL normally, from the demo store in demo mode.
async function loadCounts() {
  if (!(await hasBackend())) return demoStore.counts();
  try {
    const data = await getJSON(API_URL + 'counts.php');
    return data.counts || {};
  } catch {
    return {};
  }
}

// Thin strip under the navbar so nobody mistakes the demo for the real thing.
async function showDemoBanner() {
  if (await hasBackend()) return;
  const bar = document.createElement('div');
  bar.className = 'demo-banner';
  bar.innerHTML = `<div class="container"><strong>Demo mode</strong> · No PHP server found, so registrations are saved in this browser only.
    <a href="https://github.com/raghazzz/campus-event-hub#how-to-run-docker--easiest-on-a-mac" target="_blank" rel="noopener">Run the full PHP + MySQL version →</a></div>`;
  document.querySelector('.navbar')?.after(bar);
}
document.addEventListener('DOMContentLoaded', showDemoBanner);

// ---- Formatting helpers ----
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

function isPast(iso) {
  return new Date(iso) < new Date();
}

// Split the time left until an event into days / hours / minutes / seconds.
function timeLeft(iso) {
  const diff = new Date(iso) - new Date();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor(diff / 3600000) % 24,
    minutes: Math.floor(diff / 60000) % 60,
    seconds: Math.floor(diff / 1000) % 60
  };
}

// Short countdown text such as "T-12D 04:30:05".
function countdownText(iso) {
  const t = timeLeft(iso);
  if (!t) return 'EVENT ENDED';
  const pad = n => String(n).padStart(2, '0');
  return `T-${t.days}D ${pad(t.hours)}:${pad(t.minutes)}:${pad(t.seconds)}`;
}

// Escape text before inserting it as HTML (prevents XSS).
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// Read a value from the page URL, e.g. ?id=3
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ---- Toast message at the bottom of the screen ----
function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ---- Light / dark theme (dark by default, choice saved in localStorage) ----
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? 'Light' : 'Dark'; // label = the mode you switch TO
}

(function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch {}
  applyTheme(saved || 'dark');

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(document.documentElement.getAttribute('data-theme'));
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('theme', next); } catch {}
    });
  });
})();
