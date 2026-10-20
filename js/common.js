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

const loadEvents = () => getJSON('data/events.json');
const loadClubs  = () => getJSON('data/clubs.json');

// Registration counts per event from MySQL. Returns {} if the server is offline,
// so the site still works when opened without XAMPP.
async function loadCounts() {
  try {
    const data = await getJSON(API_URL + 'counts.php');
    return data.counts || {};
  } catch {
    return {};
  }
}

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
