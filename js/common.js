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
  // Saved list holds: full rows registered in this browser, {id, removed:true} markers
  // for deleted sample rows, and {id, patch:{...}} changes (e.g. check-in) to sample rows.
  raw() {
    try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || []; } catch { return []; }
  },
  saveRaw(list) {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(list)); return true; } catch { return false; }
  },
  // Sample rows (same as database.sql) plus anything registered in this browser.
  all() {
    const saved = this.raw();
    const removed = new Set(saved.filter(r => r.removed).map(r => r.id));
    const patches = {};
    saved.filter(r => r.patch).forEach(r => (patches[r.id] = { ...patches[r.id], ...r.patch }));
    const own = saved.filter(r => !r.removed && !r.patch);
    const sample = (window.FALLBACK_REGISTRATIONS || [])
      .filter(r => !removed.has(r.id))
      .map(r => ({ ...r, ...patches[r.id] }));
    return [...own, ...sample];
  },
  isSample(id) {
    return (window.FALLBACK_REGISTRATIONS || []).some(r => r.id === id);
  },
  add(reg) {
    const list = this.raw();
    const nextId = Math.max(5, ...this.all().map(r => r.id), ...list.map(r => r.id)) + 1;
    const row = {
      id: nextId, ...reg,
      ticket_code: makeTicketCode(),
      checked_in_at: null,
      registered_at: nowSQL()
    };
    list.unshift(row);
    this.saveRaw(list);
    return row;
  },
  update(id, changes) {
    const list = this.raw();
    if (this.isSample(id)) {
      list.push({ id, patch: changes });
    } else {
      const row = list.find(r => r.id === id && !r.removed && !r.patch);
      if (row) Object.assign(row, changes);
    }
    this.saveRaw(list);
  },
  remove(id) {
    const list = this.raw().filter(r => r.id !== id);
    if (this.isSample(id)) list.push({ id, removed: true }); // remember deleted sample rows
    this.saveRaw(list);
  },
  findByCode(code) {
    return this.all().find(r => r.ticket_code === code) || null;
  },
  counts() {
    return this.all().reduce((acc, r) => { acc[r.event_id] = (acc[r.event_id] || 0) + 1; return acc; }, {});
  }
};

// Current time as "YYYY-MM-DD HH:MM:SS" (the same format MySQL returns).
function nowSQL() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// "2026-10-21 16:41:04" -> "21 Oct, 4:41 pm"
function formatStamp(sql) {
  const d = new Date(String(sql).replace(' ', 'T'));
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

// ============ QR tickets ============
// Random ticket code like CH-7F3A9C21 (demo mode only; the real ones come from PHP).
function makeTicketCode() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return 'CH-' + [...bytes].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Pull a ticket code out of anything: a typed code, or a whole scanned link.
function extractTicketCode(text) {
  const m = String(text || '').match(/CH-[0-9A-F]{8}/i);
  return m ? m[0].toUpperCase() : null;
}

// The link stored inside each QR code: opens ticket.html for that ticket.
function ticketURL(code) {
  return new URL('ticket.html?code=' + encodeURIComponent(code), location.href).href;
}

// Build the QR matrix for a piece of text (uses js/vendor/qrcode.js).
function makeQR(text) {
  const qr = qrcode(0, 'M'); // 0 = pick the smallest size that fits, M = medium error correction
  qr.addData(text);
  qr.make();
  return qr;
}

// QR code as an inline SVG string, for showing on the page.
function qrSVG(text, cellSize = 5) {
  return makeQR(text).createSvgTag({ cellSize, margin: 2, scalable: true });
}

// Draw a downloadable ticket image (PNG) with the QR code on a canvas.
function downloadTicketPNG(t) {
  const W = 1000, H = 420, STUB = 330;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');

  g.fillStyle = '#1a1a17'; g.fillRect(0, 0, W, H);           // ticket body
  g.fillStyle = '#d4ff3a'; g.fillRect(0, 0, W, 14);           // top edge
  g.fillStyle = '#ffffff'; g.fillRect(W - STUB, 14, STUB, H - 14); // stub for the QR

  // perforation
  g.strokeStyle = '#0e0e0c'; g.setLineDash([10, 8]); g.lineWidth = 3;
  g.beginPath(); g.moveTo(W - STUB, 14); g.lineTo(W - STUB, H); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#0e0e0c';
  [[W - STUB, 0], [W - STUB, H]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 18, 0, Math.PI * 2); g.fill(); });

  // text
  const mono = '"Space Mono", "Courier New", monospace', display = '"Big Shoulders Display", Impact, sans-serif';
  g.fillStyle = '#d4ff3a'; g.font = `bold 20px ${mono}`; g.fillText('CAMPUS/HUB  ·  EVENT TICKET', 44, 70);
  g.fillStyle = '#f2f0e6'; g.font = `900 52px ${display}`;
  const titleEnd = wrapText(g, t.eventTitle.toUpperCase(), 44, 135, W - STUB - 88, 54, 2);
  g.font = `20px ${mono}`; g.fillStyle = '#8d8a7d';
  g.fillText(t.when, 44, titleEnd + 52);
  g.fillText(t.venue, 44, titleEnd + 82);
  g.fillStyle = '#f2f0e6'; g.font = `bold 24px ${mono}`;
  g.fillText(t.name, 44, 350);
  g.fillStyle = '#8d8a7d'; g.font = `18px ${mono}`;
  g.fillText(`Reg. No. ${t.regNo}`, 44, 382);

  // QR on the stub
  const qr = makeQR(ticketURL(t.code)), n = qr.getModuleCount(), size = 240, cell = size / n;
  const qx = W - STUB + (STUB - size) / 2, qy = 48;
  g.fillStyle = '#0e0e0c';
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) {
    if (qr.isDark(r, col)) g.fillRect(qx + col * cell, qy + r * cell, Math.ceil(cell), Math.ceil(cell));
  }
  g.font = `bold 22px ${mono}`; g.textAlign = 'center';
  g.fillText(t.code, W - STUB / 2, qy + size + 50);
  g.textAlign = 'left';

  const link = document.createElement('a');
  link.download = `ticket-${t.code}.png`;
  link.href = c.toDataURL('image/png');
  link.click();
}

// Canvas helper: wrap long text over several lines.
function wrapText(g, text, x, y, maxW, lineH, maxLines) {
  const words = text.split(' '); let line = '', lines = 0;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y); y += lineH; line = w;
      if (++lines >= maxLines - 1) break;
    } else line = test;
  }
  g.fillText(line, x, y);
  return y; // baseline of the last line, so the next text can follow it
}

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
