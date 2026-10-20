# Campus Event Hub

A single place for MUJ students to browse club events and register for them.
Built with **HTML, CSS, JavaScript and JSON**, with **PHP + MySQL** for saving registrations.

**Web Technology Mini Project** · Raghav Malhotra · B.Tech CSE (AI & ML) · Reg. No. 2427010321 · Manipal University Jaipur

**▶ Live demo: [raghazzz.github.io/campus-event-hub](https://raghazzz.github.io/campus-event-hub/)**
The live demo runs without a server, so it opens in **demo mode**: browsing, search, countdowns, registration and the admin view all work, but registrations are saved in your browser only. For the full version with PHP + MySQL, run it locally (below).

![Home page](screenshots/home.png)

| Event details | Registration | Admin dashboard |
|---|---|---|
| ![Event](screenshots/event.png) | ![Register](screenshots/register.png) | ![Admin](screenshots/admin.png) |

## Features
- Event listing loaded from `data/events.json` with `fetch()`
- Live search, category chips, club filter, upcoming/past filter
- Live countdown timer on every event (updates every second, e.g. T-12D 04:30:05)
- Seats-left progress bar (counts come from MySQL)
- Event details page with a large countdown and a copy-link button
- Registration form with live JavaScript validation, sent to the server as JSON
- Server-side validation, duplicate check and capacity check in PHP
- Admin login (hashed passwords, PHP sessions)
- Admin dashboard: stats, search, filter by event, delete, export to CSV
- "Ticket Booth" design: dark by default with a Light button for dim projectors (saved in `localStorage`), scrolling event ticker, ticket-shaped cards, fully responsive

## Folder structure
```
campus-event-hub/
├── index.html        Home page: all events
├── event.html        One event's details
├── register.html     Registration form
├── admin.html        Admin login + dashboard
├── css/style.css     All styles (light + dark theme)
├── js/
│   ├── common.js     Shared helpers: fetch, dates, countdown, theme, demo mode
│   ├── home.js       Listing, search and filters
│   ├── event.js      Event details + countdown
│   ├── register.js   Form validation + submit
│   └── admin.js      Dashboard, delete, CSV export
├── data/
│   ├── events.json   Event data
│   ├── clubs.json    Club data (each club has its own accent colour)
│   └── fallback.js   Offline copy of the data, used in demo mode
├── api/
│   ├── config.php        DB connection + helpers
│   ├── register.php      POST: save a registration
│   ├── counts.php        GET: registrations per event
│   ├── auth.php          Admin login / logout / status
│   └── registrations.php GET list, DELETE one (admin only)
├── database.sql      Creates the database, tables and a default admin
├── Dockerfile + docker-compose.yml   Run everything with one command
└── tools/build_fallback.py          Refreshes data/fallback.js after editing events.json
```

## How to run (Docker — easiest on a Mac)
1. Open **Docker Desktop** and wait until it says it's running.
2. In Terminal, go to this folder and start everything:
   ```bash
   cd ~/Desktop/campus-event-hub
   docker compose up -d
   ```
   The first run downloads PHP, MariaDB and phpMyAdmin (a few minutes). The database and default admin are created automatically from `database.sql`.
3. Open **http://localhost:8080**. phpMyAdmin is at **http://localhost:8081** (user `root`, password `campushub`).
4. To stop: `docker compose down`. Registrations are kept for next time. To wipe the database and start fresh: `docker compose down -v`.

## How to run (XAMPP)
1. Install XAMPP and open the **XAMPP Control Panel**. Start **Apache** and **MySQL**.
2. Copy the `campus-event-hub` folder into `C:\xampp\htdocs\` (on macOS, `/Applications/XAMPP/htdocs/`).
3. Open **http://localhost/phpmyadmin**, go to the **Import** tab, choose `database.sql` and click **Go**.
4. Open **http://localhost/campus-event-hub/** in your browser.

Admin login: **username `admin`, password `admin123`**.

> Always open the site through `http://localhost/...`. Double-clicking `index.html` opens it as a `file://` page, and the browser blocks `fetch()` there.

If your MySQL root user has a password, set it in `api/config.php`.

## Adding a new event
Add an object to `data/events.json` with a new `id`, then run `python3 tools/build_fallback.py` so the offline copy in `data/fallback.js` matches, and refresh the page. No database change is needed.

## Demo mode (no server)
When the page can't reach PHP (opened by double-clicking `index.html`, or hosted on GitHub Pages), `hasBackend()` in `js/common.js` detects it and the site switches to demo mode:
- Event and club data come from `data/fallback.js` instead of `fetch()`
- Registrations use the same validation, duplicate and capacity rules, but are stored in `localStorage`
- The admin dashboard shows the sample rows plus browser-saved ones (demo login `admin` / `admin123`)
- A banner under the navbar makes it clear that this is the demo

With PHP + MySQL running, none of this is used and everything goes through the API.

## How data flows
```
Browser (HTML/CSS/JS)
   │  fetch('data/events.json')         → event and club info (JSON)
   │  fetch('api/counts.php')           → seats taken (JSON from MySQL)
   │  POST JSON to 'api/register.php'   → PHP validates → INSERT into MySQL
   ▼
PHP (api/*.php) ──► MySQL (registrations, admins)
```
