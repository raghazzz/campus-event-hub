// ============ Offline fallback data ============
// Copies of data/events.json, data/clubs.json and the sample rows in database.sql.
// Used only when the page can't fetch the JSON files or reach PHP — for example
// when index.html is double-clicked, or the site is hosted on GitHub Pages.
// If you edit events.json, run:  python3 tools/build_fallback.py  to refresh this file.

window.FALLBACK_EVENTS = [
  {
    "id": 1,
    "title": "HackMUJ 24-Hour Hackathon",
    "club": "acm",
    "category": "Tech",
    "date": "2026-11-14T09:00:00",
    "venue": "AB-1 Seminar Hall",
    "capacity": 120,
    "tags": [
      "hackathon",
      "coding",
      "prizes"
    ],
    "description": "Teams of up to four build a working prototype in 24 hours. Mentors from industry, food all night and prizes for the top three teams. Bring your laptop and charger."
  },
  {
    "id": 2,
    "title": "Golden Hour Photo Walk",
    "club": "aperture",
    "category": "Arts",
    "date": "2026-11-08T16:30:00",
    "venue": "Main Gate (meeting point)",
    "capacity": 40,
    "tags": [
      "photography",
      "outdoor"
    ],
    "description": "A guided walk around campus during golden hour. Learn composition and exposure basics on the go. Phone cameras are welcome; a few club cameras will be available to borrow."
  },
  {
    "id": 3,
    "title": "Intro to Arduino Workshop",
    "club": "ieee",
    "category": "Workshop",
    "date": "2026-11-21T14:00:00",
    "venue": "Electronics Lab, AB-2",
    "capacity": 30,
    "tags": [
      "robotics",
      "hands-on"
    ],
    "description": "Build your first circuit and program an Arduino to blink, sense and respond. All kits are provided, and no prior electronics experience is needed."
  },
  {
    "id": 4,
    "title": "Inter-Department Debate",
    "club": "litsoc",
    "category": "Cultural",
    "date": "2026-11-28T11:00:00",
    "venue": "Sharda Pai Auditorium",
    "capacity": 200,
    "tags": [
      "debate",
      "public speaking"
    ],
    "description": "Departments face off in a parliamentary-style debate. Register as a speaker or come to watch and vote for the audience-choice award."
  },
  {
    "id": 5,
    "title": "Open Mic Night",
    "club": "music",
    "category": "Cultural",
    "date": "2026-12-05T18:30:00",
    "venue": "Student Activity Centre",
    "capacity": 150,
    "tags": [
      "music",
      "poetry",
      "comedy"
    ],
    "description": "Sing, play, recite or do stand-up. Five-minute slots, a friendly crowd and free chai. Performers should register; listeners can just turn up."
  },
  {
    "id": 6,
    "title": "Web Dev Bootcamp: Build Your Portfolio",
    "club": "acm",
    "category": "Workshop",
    "date": "2026-12-12T10:00:00",
    "venue": "Lab 3, AB-1",
    "capacity": 60,
    "tags": [
      "html",
      "css",
      "javascript"
    ],
    "description": "A full-day bootcamp on HTML, CSS and JavaScript. You will leave with a deployed personal portfolio site."
  },
  {
    "id": 7,
    "title": "Inter-Hostel Football Cup",
    "club": "sports",
    "category": "Sports",
    "date": "2026-12-19T07:30:00",
    "venue": "Main Football Ground",
    "capacity": 160,
    "tags": [
      "football",
      "tournament"
    ],
    "description": "Seven-a-side knockout tournament between hostel teams. Captains register on behalf of their squad of up to 10 players."
  },
  {
    "id": 8,
    "title": "Freshers' Photography Contest",
    "club": "aperture",
    "category": "Arts",
    "date": "2026-10-10T10:00:00",
    "venue": "Online submission",
    "capacity": 100,
    "tags": [
      "contest",
      "photography"
    ],
    "description": "Theme: 'First Week at MUJ'. Submissions are closed and results have been announced on the club page."
  }
];

window.FALLBACK_CLUBS = [
  {
    "id": "acm",
    "name": "MUJ ACM",
    "color": "#d4ff3a",
    "about": "Coding, hackathons and tech talks."
  },
  {
    "id": "aperture",
    "name": "Aperture",
    "color": "#ff3d8b",
    "about": "The photography club of MUJ."
  },
  {
    "id": "ieee",
    "name": "IEEE MUJ",
    "color": "#22c3e6",
    "about": "Electronics, robotics and research."
  },
  {
    "id": "litsoc",
    "name": "Literary Society",
    "color": "#9b7bff",
    "about": "Debates, MUNs, poetry and quizzes."
  },
  {
    "id": "music",
    "name": "Music Club",
    "color": "#ff5a1f",
    "about": "Jams, open mics and band nights."
  },
  {
    "id": "sports",
    "name": "Sports Council",
    "color": "#2fd47a",
    "about": "Tournaments and fitness events."
  }
];

window.FALLBACK_REGISTRATIONS = [
  {
    "id": 1,
    "event_id": 1,
    "name": "Aarav Mehta",
    "reg_no": "2427010101",
    "email": "aarav.mehta@example.com",
    "phone": "9876543210",
    "department": "CSE",
    "year": 3,
    "registered_at": "2026-10-19 20:55:00",
    "ticket_code": "CH-7F3A9C21",
    "checked_in_at": null
  },
  {
    "id": 2,
    "event_id": 1,
    "name": "Diya Sharma",
    "reg_no": "2427010102",
    "email": "diya.sharma@example.com",
    "phone": "9876543211",
    "department": "IT",
    "year": 2,
    "registered_at": "2026-10-19 20:55:00",
    "ticket_code": "CH-B84E1D07",
    "checked_in_at": null
  },
  {
    "id": 3,
    "event_id": 2,
    "name": "Kabir Singh",
    "reg_no": "2427010103",
    "email": "kabir.singh@example.com",
    "phone": "9876543212",
    "department": "ECE",
    "year": 1,
    "registered_at": "2026-10-19 20:55:00",
    "ticket_code": "CH-2C6D5F90",
    "checked_in_at": null
  },
  {
    "id": 4,
    "event_id": 3,
    "name": "Ananya Gupta",
    "reg_no": "2427010104",
    "email": "ananya.gupta@example.com",
    "phone": "9876543213",
    "department": "EEE",
    "year": 2,
    "registered_at": "2026-10-19 20:55:00",
    "ticket_code": "CH-E19A4B36",
    "checked_in_at": null
  },
  {
    "id": 5,
    "event_id": 5,
    "name": "Rohan Verma",
    "reg_no": "2427010105",
    "email": "rohan.verma@example.com",
    "phone": "9876543214",
    "department": "ME",
    "year": 4,
    "registered_at": "2026-10-19 20:55:00",
    "ticket_code": "CH-5D02C8AF",
    "checked_in_at": null
  }
];
