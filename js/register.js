// ============ Registration form: validation + submit to MySQL ============

// Validation rules for each field: a test function and an error message.
const rules = {
  name:       { test: v => /^[A-Za-z .'-]{3,100}$/.test(v), msg: 'Enter your full name (letters only, at least 3).' },
  reg_no:     { test: v => /^[A-Za-z0-9]{6,20}$/.test(v),   msg: 'Use 6-20 letters or digits, no spaces.' },
  phone:      { test: v => /^[6-9]\d{9}$/.test(v),          msg: 'Enter a valid 10-digit mobile number.' },
  email:      { test: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), msg: 'Enter a valid email address.' },
  department: { test: v => v !== '',                         msg: 'Choose your department.' },
  year:       { test: v => v !== '',                         msg: 'Choose your year.' }
};

let currentEvent = null;

document.addEventListener('DOMContentLoaded', async () => {
  const eventId = Number(getParam('id'));
  document.getElementById('backLink').href = `event.html?id=${eventId}`;

  // Show which event the student is registering for.
  try {
    const events = await loadEvents();
    currentEvent = events.find(e => e.id === eventId);
    const summary = document.getElementById('eventSummary');

    if (!currentEvent) {
      summary.textContent = 'Event not found.';
      document.getElementById('submitBtn').disabled = true;
      return;
    }
    summary.textContent = `${currentEvent.title} · ${formatDate(currentEvent.date)}, ${formatTime(currentEvent.date)} · ${currentEvent.venue}`;

    if (isPast(currentEvent.date)) {
      showFormError('Registrations for this event are closed.');
      document.getElementById('submitBtn').disabled = true;
    }
  } catch (err) {
    showFormError('Could not load event details.');
  }

  const form = document.getElementById('regForm');

  // Live validation: check a field as the user types or leaves it.
  Object.keys(rules).forEach(name => {
    const input = form.elements[name];
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (name === 'phone') input.value = input.value.replace(/\D/g, ''); // digits only
      if (input.closest('.field').classList.contains('invalid')) validateField(input);
    });
  });

  form.addEventListener('submit', handleSubmit);
});

// Check one field and show/hide its error message. Returns true if valid.
function validateField(input) {
  const field = input.closest('.field');
  const ok = rules[input.name].test(input.value.trim());
  field.classList.toggle('invalid', !ok);
  field.classList.toggle('valid', ok);
  field.querySelector('.error-msg').textContent = ok ? '' : rules[input.name].msg;
  return ok;
}

async function handleSubmit(e) {
  e.preventDefault(); // stop the normal page reload
  hideFormError();

  const form = e.target;
  const inputs = Object.keys(rules).map(name => form.elements[name]);
  const allValid = inputs.map(validateField).every(Boolean);

  if (!allValid) {
    form.querySelector('.invalid input, .invalid select').focus();
    return;
  }

  // Build a JS object from the form, then send it as JSON.
  // (form.elements is used because form.name would return the form's own name.)
  const f = form.elements;
  const data = {
    event_id: currentEvent.id,
    name: f['name'].value.trim(),
    reg_no: f['reg_no'].value.trim().toUpperCase(),
    phone: f['phone'].value.trim(),
    email: f['email'].value.trim(),
    department: f['department'].value,
    year: Number(f['year'].value)
  };

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Registering…';

  try {
    // Real server: PHP validates and saves to MySQL. Demo mode: same rules, saved in the browser.
    const result = (await hasBackend())
      ? await postJSON(API_URL + 'register.php', data)
      : registerInDemo(data);
    document.getElementById('formSection').classList.add('hidden');
    document.getElementById('successSection').classList.remove('hidden');
    document.getElementById('successText').textContent =
      `${result.message} Your registration ID is #${result.registration_id}. See you on ${formatDate(currentEvent.date)}.`;
  } catch (err) {
    showFormError(err.message === 'Failed to fetch'
      ? 'Cannot reach the server. Make sure Apache and MySQL are running in XAMPP.'
      : err.message);
    btn.disabled = false;
    btn.textContent = 'Confirm registration';
  }
}

// Demo mode only: apply the same checks as register.php, then save in localStorage.
function registerInDemo(data) {
  const all = demoStore.all();
  if (isPast(currentEvent.date)) throw new Error('Registrations for this event are closed.');
  if (all.some(r => r.event_id === data.event_id && r.reg_no === data.reg_no)) {
    throw new Error('This registration number is already registered for this event.');
  }
  if (all.filter(r => r.event_id === data.event_id).length >= currentEvent.capacity) {
    throw new Error('Sorry, this event is full.');
  }
  const row = demoStore.add(data);
  return {
    ok: true,
    registration_id: row.id,
    message: `You're registered for ${currentEvent.title}! (Demo mode: saved in this browser only.)`
  };
}

function showFormError(msg) {
  const box = document.getElementById('formError');
  box.textContent = msg;
  box.classList.remove('hidden');
}

function hideFormError() {
  document.getElementById('formError').classList.add('hidden');
}
