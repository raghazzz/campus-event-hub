// ============ Ticket page: is this QR ticket valid? ============

let eventsById = {};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    (await loadEvents()).forEach(e => (eventsById[e.id] = e));
  } catch {}

  document.getElementById('lookupForm').addEventListener('submit', e => {
    e.preventDefault();
    const code = extractTicketCode(document.getElementById('codeInput').value);
    if (!code) return showResult('invalid', 'That is not a valid ticket code. Codes look like CH-7F3A9C21.');
    history.replaceState(null, '', '?code=' + code); // keep the URL shareable
    checkTicket(code);
  });

  const code = extractTicketCode(getParam('code'));
  if (code) {
    document.getElementById('codeInput').value = code;
    checkTicket(code);
  }
});

async function checkTicket(code) {
  showResult('loading', 'Checking ticket…');

  // Real server: ask PHP/MySQL. Demo mode: look in this browser's saved registrations.
  if (await hasBackend()) {
    try {
      const data = await getJSON(API_URL + 'ticket.php?code=' + encodeURIComponent(code));
      renderTicket(data.ticket);
    } catch (err) {
      showResult('invalid', err.message);
    }
    return;
  }

  const row = demoStore.findByCode(code);
  if (!row) {
    return showResult('invalid', 'No ticket found with this code in this browser. In demo mode, tickets are only saved in the browser they were created in.');
  }
  renderTicket({
    code: row.ticket_code,
    name: row.name,
    reg_no: '••••••' + String(row.reg_no).slice(-4),
    event_id: row.event_id,
    event_title: eventsById[row.event_id]?.title || 'Event ' + row.event_id,
    checked_in_at: row.checked_in_at
  });
}

function renderTicket(t) {
  const ev = eventsById[t.event_id];
  const used = Boolean(t.checked_in_at);
  const status = used
    ? `<div class="ticket-status used">Already used · checked in ${formatStamp(t.checked_in_at)}</div>`
    : `<div class="ticket-status valid">✓ Valid ticket</div>`;

  document.getElementById('ticketResult').innerHTML = `
    ${status}
    <div class="qr-ticket">
      <div class="qr-ticket-main">
        <span class="label">Event ticket</span>
        <h3>${escapeHTML(t.event_title)}</h3>
        <div class="info">
          ${ev ? `<span>When</span><b>${formatDate(ev.date)}, ${formatTime(ev.date)}</b>
                  <span>Venue</span><b>${escapeHTML(ev.venue)}</b>` : ''}
          <span>Name</span><b>${escapeHTML(t.name)}</b>
          <span>Reg. No.</span><b>${escapeHTML(t.reg_no)}</b>
        </div>
      </div>
      <div class="qr-ticket-stub">
        <div class="qr-box">${qrSVG(ticketURL(t.code))}</div>
        <code>${escapeHTML(t.code)}</code>
      </div>
    </div>
    <p class="ticket-hint">Organisers check tickets in from the Admin dashboard.</p>`;
}

function showResult(kind, message) {
  document.getElementById('ticketResult').innerHTML =
    `<div class="ticket-status ${kind === 'invalid' ? 'invalid' : 'loading'}">${escapeHTML(message)}</div>`;
}
