<?php
// POST api/register.php
// Body (JSON): { event_id, name, reg_no, email, phone, department, year }
// Saves one registration in MySQL.

require 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['ok' => false, 'error' => 'Use POST.'], 405);
}

$in = readJsonBody();

$eventId    = (int)($in['event_id'] ?? 0);
$name       = trim($in['name'] ?? '');
$regNo      = strtoupper(trim($in['reg_no'] ?? ''));
$email      = trim($in['email'] ?? '');
$phone      = trim($in['phone'] ?? '');
$department = trim($in['department'] ?? '');
$year       = (int)($in['year'] ?? 0);

// Server-side validation (never trust only the browser's checks).
$errors = [];
if (!preg_match("/^[A-Za-z .'-]{3,100}$/", $name))   $errors[] = 'Name should be 3-100 letters.';
if (!preg_match('/^[A-Z0-9]{6,20}$/', $regNo))       $errors[] = 'Registration number should be 6-20 letters/digits.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL))      $errors[] = 'Email is not valid.';
if (!preg_match('/^[6-9][0-9]{9}$/', $phone))        $errors[] = 'Phone must be a 10-digit Indian mobile number.';
if ($department === '')                              $errors[] = 'Choose a department.';
if ($year < 1 || $year > 4)                          $errors[] = 'Year must be 1 to 4.';
if ($errors) respond(['ok' => false, 'error' => implode(' ', $errors)], 422);

// The event must exist and must not be over.
$event = findEvent($eventId);
if (!$event) respond(['ok' => false, 'error' => 'Event not found.'], 404);
if (strtotime($event['date']) < time()) {
    respond(['ok' => false, 'error' => 'Registrations for this event are closed.'], 410);
}

// Check seats left.
$stmt = $conn->prepare('SELECT COUNT(*) FROM registrations WHERE event_id = ?');
$stmt->bind_param('i', $eventId);
$stmt->execute();
$stmt->bind_result($count);
$stmt->fetch();
$stmt->close();
if ($count >= $event['capacity']) {
    respond(['ok' => false, 'error' => 'Sorry, this event is full.'], 409);
}

// Insert using a prepared statement (protects against SQL injection).
$stmt = $conn->prepare(
    'INSERT INTO registrations (event_id, name, reg_no, email, phone, department, year)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
);
$stmt->bind_param('isssssi', $eventId, $name, $regNo, $email, $phone, $department, $year);

if (!$stmt->execute()) {
    if ($conn->errno === 1062) { // duplicate key = already registered
        respond(['ok' => false, 'error' => 'This registration number is already registered for this event.'], 409);
    }
    respond(['ok' => false, 'error' => 'Could not save registration.'], 500);
}

respond([
    'ok' => true,
    'registration_id' => $stmt->insert_id,
    'message' => "You're registered for {$event['title']}!"
], 201);
