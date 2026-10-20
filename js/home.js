// ============ Home page: list, search and filter events ============

let allEvents = [];
let clubsById = {};
let counts = {};

// Current filter state
const filters = { search: '', category: 'All', club: 'all', time: 'upcoming' };

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    // Load all three data sources at the same time.
    const [events, clubs, regCounts] = await Promise.all([loadEvents(), loadClubs(), loadCounts()]);
    allEvents = events.sort((a, b) => new Date(a.date) - new Date(b.date));
    clubs.forEach(c => (clubsById[c.id] = c));
    counts = regCounts;

    renderStats(clubs);
    renderCategoryChips();
    renderClubFilter(clubs);
    attachListeners();
    render();

    // Update every countdown once a second.
    setInterval(updateCountdowns, 1000);
  } catch (err) {
    document.getElementById('eventGrid').innerHTML =
      `<p class="empty">Could not load events. Open the site through XAMPP (http://localhost/…), not by double-clicking the file.<br><small>${escapeHTML(err.message)}</small></p>`;
  }
}

function renderStats(clubs) {
  const upcoming = allEvents.filter(e => !isPast(e.date)).length;
  const totalRegs = Object.values(counts).reduce((sum, n) => sum + n, 0);
  document.getElementById('statUpcoming').textContent = upcoming;
  document.getElementById('stickerCount').textContent = upcoming;
  document.getElementById('statClubs').textContent = clubs.length;
  document.getElementById('statRegs').textContent = totalRegs;

  // Scrolling ticker of upcoming events. The list is added twice so the
  // CSS animation (translateX -50%) loops without a visible jump.
  const items = allEvents
    .filter(e => !isPast(e.date))
    .map(e => `<span>★ ${escapeHTML(e.title)} — ${new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>`)
    .join('');
  document.getElementById('ticker').innerHTML = items + items;
}

function renderCategoryChips() {
  const categories = ['All', ...new Set(allEvents.map(e => e.category))];
  const wrap = document.getElementById('categoryChips');
  wrap.innerHTML = categories
    .map(cat => `<button class="chip ${cat === filters.category ? 'active' : ''}" data-category="${cat}">${cat}</button>`)
    .join('');
}

function renderClubFilter(clubs) {
  const select = document.getElementById('clubFilter');
  clubs.forEach(c => select.insertAdjacentHTML('beforeend', `<option value="${c.id}">${escapeHTML(c.name)}</option>`));
}

function attachListeners() {
  document.getElementById('searchInput').addEventListener('input', e => {
    filters.search = e.target.value.trim().toLowerCase();
    render();
  });

  // Event delegation: one listener handles clicks on every chip.
  document.getElementById('categoryChips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    filters.category = chip.dataset.category;
    document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
    render();
  });

  document.getElementById('clubFilter').addEventListener('change', e => { filters.club = e.target.value; render(); });
  document.getElementById('timeFilter').addEventListener('change', e => { filters.time = e.target.value; render(); });
}

// Apply every filter and return the matching events.
function getFilteredEvents() {
  return allEvents.filter(ev => {
    const club = clubsById[ev.club];
    const haystack = [ev.title, ev.venue, ev.category, club?.name, ...ev.tags].join(' ').toLowerCase();

    if (filters.search && !haystack.includes(filters.search)) return false;
    if (filters.category !== 'All' && ev.category !== filters.category) return false;
    if (filters.club !== 'all' && ev.club !== filters.club) return false;
    if (filters.time === 'upcoming' && isPast(ev.date)) return false;
    if (filters.time === 'past' && !isPast(ev.date)) return false;
    return true;
  });
}

function render() {
  const events = getFilteredEvents();
  const grid = document.getElementById('eventGrid');
  document.getElementById('resultCount').textContent = `${events.length} event${events.length === 1 ? '' : 's'} found`;

  if (events.length === 0) {
    grid.innerHTML = '<p class="empty">No events match your search. Try another keyword or filter.</p>';
    return;
  }
  grid.innerHTML = events.map(eventCard).join('');
}

// Build the HTML for one event, shaped like a ticket with a tear-off stub.
function eventCard(ev, index) {
  const club = clubsById[ev.club] || { name: ev.club, color: '#d4ff3a' };
  const d = new Date(ev.date);
  const month = d.toLocaleDateString('en-IN', { month: 'short' });
  const registered = counts[ev.id] || 0;
  const seatsLeft = Math.max(ev.capacity - registered, 0);
  const past = isPast(ev.date);

  // Seat meter: 20 small blocks, filled in proportion to seats taken.
  const filled = registered ? Math.max(Math.round((registered / ev.capacity) * 20), 1) : 0;
  const meter = Array.from({ length: 20 }, (_, i) => `<i class="${i < filled ? 'f' : ''}"></i>`).join('');

  return `
    <a class="ticket ${past ? 'past' : ''}" href="event.html?id=${ev.id}"
       style="--c:${club.color}; animation-delay:${index * 70}ms">
      <div class="ticket-main">
        <div class="club-tag">${escapeHTML(club.name)} · ${escapeHTML(ev.category)}</div>
        <h3>${escapeHTML(ev.title)}</h3>
        <div class="info">
          <span>Venue</span><b>${escapeHTML(ev.venue)}</b>
          <span>Seats</span><b>${past ? 'Registrations closed' : `${seatsLeft} / ${ev.capacity} left`}</b>
        </div>
        <div class="meter">${meter}</div>
        <div class="ticket-foot">
          <span class="countdown ${past ? 'ended' : ''}" data-date="${ev.date}">${countdownText(ev.date)}</span>
          <span class="go">Details →</span>
        </div>
      </div>
      <div class="stub">
        <span class="m">${month}</span>
        <span class="d">${d.getDate()}</span>
        <span class="t">${formatTime(ev.date)}</span>
      </div>
    </a>`;
}

// Only the countdown text changes each second, so we don't re-render the cards.
function updateCountdowns() {
  document.querySelectorAll('.countdown[data-date]').forEach(el => {
    el.textContent = countdownText(el.dataset.date);
    el.classList.toggle('ended', isPast(el.dataset.date));
  });
}
