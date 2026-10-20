// ============ Admin dashboard: login, view, filter, export, delete ============

let registrations = [];
let eventsById = {};

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
  await postJSON(API_URL + 'auth.php', { action: 'logout' }).catch(() => {});
  registrations = [];
  showLogin();
}

async function fetchRegistrations() {
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

  document.getElementById('kpiTotal').textContent = registrations.length;
  document.getElementById('kpiEvents').textContent = Object.keys(perEvent).length;
  document.getElementById('kpiTop').textContent = topId ? (eventsById[topId]?.title || `Event ${topId}`) : '–';
  document.getElementById('kpiTopCount').textContent = topId ? `${topCount} registrations` : '';
}

function getVisibleRows() {
  const q = document.getElementById('adminSearch').value.trim().toLowerCase();
  const eventId = document.getElementById('eventFilter').value;

  return registrations.filter(r => {
    if (eventId !== 'all' && String(r.event_id) !== eventId) return false;
    if (q && ![r.name, r.reg_no, r.email].join(' ').toLowerCase().includes(q)) return false;
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
      <td>${escapeHTML(r.email)}</td>
      <td>${escapeHTML(r.phone)}</td>
      <td>${new Date(r.registered_at.replace(' ', 'T')).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
      <td><button class="btn btn-danger" data-id="${r.id}">Delete</button></td>
    </tr>`).join('');
}

async function handleDelete(e) {
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;
  if (!confirm('Delete this registration? This cannot be undone.')) return;

  try {
    await getJSON(`${API_URL}registrations.php?id=${btn.dataset.id}`, { method: 'DELETE' });
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

  const header = ['ID', 'Name', 'Reg No', 'Event', 'Department', 'Year', 'Email', 'Phone', 'Registered At'];
  const lines = rows.map(r => [
    r.id, r.name, r.reg_no, eventsById[r.event_id]?.title || r.event_id,
    r.department, r.year, r.email, r.phone, r.registered_at
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
