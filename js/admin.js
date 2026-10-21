// ============ Admin dashboard: login, view, filter, export, delete ============

let registrations = [];
let eventsById = {};
let demo = false; // true when no PHP server is found (see hasBackend() in common.js)
const DEMO_SESSION = 'campushub-demo-admin';

document.addEventListener('DOMContentLoaded', async () => {
  // Event titles come from the JSON file; registrations come from MySQL.
  try {
    const events = await loadEvents();
    events.forEach(e => (eventsById[e.id] = e));
    const select = document.getElementById('eventFilter');
    events.forEach(e => select.insertAdjacentHTML('beforeend', `<option value="${e.id}">${escapeHTML(e.title)}</option>`));
  } catch {}

  document.getElementById('loginForm').addEventListener('submit', login);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
  document.getElementById('adminSearch').addEventListener('input', renderTable);
  document.getElementById('eventFilter').addEventListener('change', renderTable);
  document.getElementById('regTable').addEventListener('click', handleDelete);
  document.getElementById('checkinForm').addEventListener('submit', e => {
    e.preventDefault();
    checkIn(document.getElementById('checkinCode').value);
  });
  document.getElementById('scanBtn').addEventListener('click', startScanner);
  document.getElementById('stopScan').addEventListener('click', stopScanner);

  // Demo mode: no PHP server, so the dashboard runs on browser-saved data.
  demo = !(await hasBackend());
  if (demo) {
    document.querySelector('#loginForm').insertAdjacentHTML('beforebegin',
      `<div class="demo-note"><b>Demo login:</b> admin / admin123. In demo mode this is checked in the browser;
       the real version verifies a bcrypt password hash stored in MySQL.</div>`);
    let signedIn = false;
    try { signedIn = sessionStorage.getItem(DEMO_SESSION) === '1'; } catch {}
    signedIn ? showDashboard('admin (demo)') : showLogin();
    return;
  }

  // Is the admin already logged in (PHP session)?
  try {
    const status = await getJSON(API_URL + 'auth.php');
    status.loggedIn ? showDashboard(status.username) : showLogin();
  } catch (err) {
    showLogin('Cannot reach the server. Start Apache and MySQL in XAMPP.');
  }
});

function showLogin(errorMsg) {
  document.getElementById('loginSection').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  const box = document.getElementById('loginError');
  box.textContent = errorMsg || '';
  box.classList.toggle('hidden', !errorMsg);
}

async function showDashboard(username) {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('welcomeText').textContent = `Signed in as ${username}`;
  await fetchRegistrations();
}

async function login(e) {
  e.preventDefault();
  if (demo) {
    const ok = document.getElementById('username').value.trim() === 'admin' &&
               document.getElementById('password').value === 'admin123';
    if (!ok) return showLogin('Wrong username or password.');
    try { sessionStorage.setItem(DEMO_SESSION, '1'); } catch {}
    return showDashboard('admin (demo)');
  }
  try {
    const result = await postJSON(API_URL + 'auth.php', {
      action: 'login',
      username: document.getElementById('username').value.trim(),
      password: document.getElementById('password').value
    });
    showDashboard(result.username);
  } catch (err) {
    showLogin(err.message);
  }
}

async function logout() {
  stopScanner();
  if (demo) {
    try { sessionStorage.removeItem(DEMO_SESSION); } catch {}
    registrations = [];
    return showLogin();
  }
  await postJSON(API_URL + 'auth.php', { action: 'logout' }).catch(() => {});
  registrations = [];
  showLogin();
}

async function fetchRegistrations() {
  if (demo) {
    registrations = demoStore.all();
    renderKPIs();
    renderTable();
    return;
  }
  try {
    const data = await getJSON(API_URL + 'registrations.php');
    registrations = data.registrations;
    renderKPIs();
    renderTable();
  } catch (err) {
    showLogin(err.message);
  }
}

function renderKPIs() {
  // Count registrations per event using reduce().
  const perEvent = registrations.reduce((acc, r) => {
    acc[r.event_id] = (acc[r.event_id] || 0) + 1;
    return acc;
  }, {});
  const [topId, topCount] = Object.entries(perEvent).sort((a, b) => b[1] - a[1])[0] || [];

  const checked = registrations.filter(r => r.checked_in_at).length;
  document.getElementById('kpiTotal').textContent = registrations.length;
  document.getElementById('kpiChecked').textContent = checked;
  document.getElementById('kpiCheckedPct').textContent = registrations.length
    ? `${Math.round((checked / registrations.length) * 100)}% of all tickets` : '';
  document.getElementById('kpiEvents').textContent = Object.keys(perEvent).length;
  document.getElementById('kpiTop').textContent = topId ? (eventsById[topId]?.title || `Event ${topId}`) : '–';
  document.getElementById('kpiTopCount').textContent = topId ? `${topCount} registrations` : '';
}

function getVisibleRows() {
  const q = document.getElementById('adminSearch').value.trim().toLowerCase();
  const eventId = document.getElementById('eventFilter').value;

  return registrations.filter(r => {
    if (eventId !== 'all' && String(r.event_id) !== eventId) return false;
    if (q && ![r.name, r.reg_no, r.email, r.ticket_code].join(' ').toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderTable() {
  const rows = getVisibleRows();
  const tbody = document.getElementById('regTable');

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:32px; color:var(--muted);">No registrations found.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${escapeHTML(r.name)}</td>
      <td>${escapeHTML(r.reg_no)}</td>
      <td>${escapeHTML(eventsById[r.event_id]?.title || 'Event ' + r.event_id)}</td>
      <td>${escapeHTML(r.department)} · Y${r.year}</td>
      <td><code>${escapeHTML(r.ticket_code || '–')}</code></td>
      <td>${r.checked_in_at
        ? `<span class="pill pill-in">Checked in</span>`
        : `<span class="pill">Not yet</span>`}</td>
      <td>${new Date(r.registered_at.replace(' ', 'T')).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
      <td><button class="btn btn-danger" data-id="${r.id}">Delete</button></td>
    </tr>`).join('');
}

async function handleDelete(e) {
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;
  if (!confirm('Delete this registration? This cannot be undone.')) return;

  try {
    if (demo) demoStore.remove(Number(btn.dataset.id));
    else await getJSON(`${API_URL}registrations.php?id=${btn.dataset.id}`, { method: 'DELETE' });
    registrations = registrations.filter(r => String(r.id) !== btn.dataset.id);
    renderKPIs();
    renderTable();
    showToast('Registration deleted');
  } catch (err) {
    showToast(err.message);
  }
}

// Turn the visible rows into a CSV file and download it.
function exportCSV() {
  const rows = getVisibleRows();
  if (rows.length === 0) return showToast('Nothing to export');

  const header = ['ID', 'Name', 'Reg No', 'Event', 'Department', 'Year', 'Email', 'Phone', 'Ticket Code', 'Checked In At', 'Registered At'];
  const lines = rows.map(r => [
    r.id, r.name, r.reg_no, eventsById[r.event_id]?.title || r.event_id,
    r.department, r.year, r.email, r.phone, r.ticket_code || '', r.checked_in_at || '', r.registered_at
  ]);

  // Wrap every value in quotes so commas inside names don't break columns.
  const csv = [header, ...lines]
    .map(line => line.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `registrations-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(`Exported ${rows.length} rows`);
}

// ============ Door check-in ============

// Check a ticket in, from a typed code or a scanned QR link.
async function checkIn(input) {
  const code = extractTicketCode(input);
  if (!code) return showCheckin('error', 'Not a ticket code. Codes look like CH-7F3A9C21.');

  try {
    const result = demo ? checkInDemo(code) : await postJSON(API_URL + 'ticket.php', { action: 'checkin', code });
    const t = result.ticket;
    if (result.status === 'already') {
      showCheckin('warn', `Already checked in at ${formatStamp(result.checked_in_at)}`, t);
    } else {
      showCheckin('ok', 'Checked in. Let them in!', t);
      // Update the table without reloading.
      const row = registrations.find(r => r.ticket_code === t.code);
      if (row) row.checked_in_at = result.checked_in_at;
      renderKPIs();
      renderTable();
    }
    document.getElementById('checkinCode').value = '';
  } catch (err) {
    showCheckin('error', err.message);
  }
}

// Demo mode: same logic as api/ticket.php, using the browser's saved data.
function checkInDemo(code) {
  const row = demoStore.findByCode(code);
  if (!row) throw new Error('No ticket found with this code.');
  const ticket = { code: row.ticket_code, name: row.name, reg_no: row.reg_no, event_title: eventsById[row.event_id]?.title || 'Event ' + row.event_id };
  if (row.checked_in_at) return { status: 'already', checked_in_at: row.checked_in_at, ticket };
  const when = nowSQL();
  demoStore.update(row.id, { checked_in_at: when });
  return { status: 'checked_in', checked_in_at: when, ticket };
}

function showCheckin(kind, message, t) {
  const who = t ? `<div class="checkin-who"><b>${escapeHTML(t.name)}</b> · ${escapeHTML(t.reg_no)}<br>${escapeHTML(t.event_title)} · <code>${escapeHTML(t.code)}</code></div>` : '';
  document.getElementById('checkinResult').innerHTML =
    `<div class="checkin-result ${kind}"><strong>${escapeHTML(message)}</strong>${who}</div>`;
}

// ---- Camera scanner (getUserMedia + jsQR) ----
let scanStream = null, scanTimer = null, lastScan = '';

async function startScanner() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return showCheckin('error', 'This browser cannot use the camera here. Type the code instead.');
  }
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  } catch {
    return showCheckin('error', 'Camera permission was blocked. Allow camera access, or type the code instead.');
  }
  const video = document.getElementById('scanVideo');
  video.srcObject = scanStream;
  await video.play();
  document.getElementById('scanner').classList.remove('hidden');
  document.getElementById('scanBtn').disabled = true;

  // Grab a frame several times a second and look for a QR code in it.
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  scanTimer = setInterval(() => {
    if (!video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const found = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
    if (found && found.data && found.data !== lastScan) {
      lastScan = found.data;              // ignore the same QR until a different one appears
      setTimeout(() => (lastScan = ''), 3000);
      checkIn(found.data);
    }
  }, 250);
}

function stopScanner() {
  clearInterval(scanTimer);
  scanStream?.getTracks().forEach(t => t.stop());
  scanStream = null;
  document.getElementById('scanner')?.classList.add('hidden');
  const btn = document.getElementById('scanBtn');
  if (btn) btn.disabled = false;
}
