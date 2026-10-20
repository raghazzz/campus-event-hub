// ============ Event details page ============

document.addEventListener('DOMContentLoaded', async () => {
  const box = document.getElementById('eventDetail');
  const id = Number(getParam('id'));

  try {
    const [events, clubs, counts] = await Promise.all([loadEvents(), loadClubs(), loadCounts()]);
    const ev = events.find(e => e.id === id);

    if (!ev) {
      box.innerHTML = '<p class="empty">Event not found. <a href="index.html">Go back to all events</a>.</p>';
      return;
    }

    const club = clubs.find(c => c.id === ev.club) || { name: ev.club, color: '#e8590c', about: '' };
    const registered = counts[ev.id] || 0;
    const seatsLeft = Math.max(ev.capacity - registered, 0);
    const past = isPast(ev.date);
    const full = seatsLeft === 0;

    document.title = `${ev.title} — Campus Event Hub`;

    let buttonHTML;
    if (past)      buttonHTML = '<button class="btn btn-primary" disabled>Event has ended</button>';
    else if (full) buttonHTML = '<button class="btn btn-primary" disabled>Event is full</button>';
    else           buttonHTML = `<a class="btn btn-primary" href="register.html?id=${ev.id}">Register now</a>`;

    box.innerHTML = `
      <div class="detail">
        <article class="detail-main">
          <div class="detail-banner" style="--club:${club.color}">
            <span class="badge">${escapeHTML(ev.category)}</span>
            <h1>${escapeHTML(ev.title)}</h1>
            <p class="club-name">Organised by <strong>${escapeHTML(club.name)}</strong></p>
          </div>
          <div class="detail-content">
            <h2>About this event</h2>
            <p>${escapeHTML(ev.description)}</p>
            <h2>About ${escapeHTML(club.name)}</h2>
            <p>${escapeHTML(club.about)}</p>
            <h2>Tags</h2>
            <div class="tags">${ev.tags.map(t => `<span class="badge">#${escapeHTML(t)}</span>`).join('')}</div>
          </div>
        </article>

        <aside class="side-card">
          <h3>${past ? 'This event has ended' : 'Starts in'}</h3>
          <div class="big-countdown ${past ? 'hidden' : ''}" id="bigCountdown">
            <div><strong id="cdDays">0</strong><small>Days</small></div>
            <div><strong id="cdHours">0</strong><small>Hours</small></div>
            <div><strong id="cdMins">0</strong><small>Mins</small></div>
            <div><strong id="cdSecs">0</strong><small>Secs</small></div>
          </div>
          <div class="info-row"><span>Date</span><span>${formatDate(ev.date)}</span></div>
          <div class="info-row"><span>Time</span><span>${formatTime(ev.date)}</span></div>
          <div class="info-row"><span>Venue</span><span>${escapeHTML(ev.venue)}</span></div>
          <div class="info-row"><span>Seats</span><span>${seatsLeft} left of ${ev.capacity}</span></div>
          <div class="bar"><span style="width:${Math.min((registered / ev.capacity) * 100, 100)}%"></span></div>
          ${buttonHTML}
          <button class="btn btn-ghost" id="shareBtn">Copy event link</button>
        </aside>
      </div>`;

    // Live countdown
    if (!past) {
      const tick = () => {
        const t = timeLeft(ev.date);
        if (!t) return location.reload();
        document.getElementById('cdDays').textContent = t.days;
        document.getElementById('cdHours').textContent = String(t.hours).padStart(2, '0');
        document.getElementById('cdMins').textContent = String(t.minutes).padStart(2, '0');
        document.getElementById('cdSecs').textContent = String(t.seconds).padStart(2, '0');
      };
      tick();
      setInterval(tick, 1000);
    }

    // Copy the page link to the clipboard
    document.getElementById('shareBtn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        showToast('Link copied!');
      } catch {
        showToast('Could not copy. Copy the URL from the address bar.');
      }
    });
  } catch (err) {
    box.innerHTML = `<p class="empty">Could not load the event. ${escapeHTML(err.message)}</p>`;
  }
});
