<?php
// QR tickets.
//   GET  api/ticket.php?code=CH-XXXXXXXX          -> is this ticket valid? (public, used by ticket.html)
//   POST api/ticket.php {action:"checkin", code}  -> mark the ticket as used at the door (admin only)

require 'config.php';

// Accept a raw code or a whole scanned URL like ".../ticket.html?code=CH-7F3A9C21".
function cleanCode($value) {
    if (preg_match('/CH-[0-9A-F]{8}/i', (string)$value, $m)) return strtoupper($m[0]);
    return null;
}

function findTicket($conn, $code) {
    $stmt = $conn->prepare('SELECT id, event_id, name, reg_no, department, year, ticket_code, checked_in_at
                            FROM registrations WHERE ticket_code = ?');
    $stmt->bind_param('s', $code);
    $stmt->execute();
    return $stmt->get_result()->fetch_assoc();
}

// Hide most of the registration number on the public ticket page.
function maskRegNo($regNo) {
    return str_repeat('•', max(strlen($regNo) - 4, 0)) . substr($regNo, -4);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $code = cleanCode($_GET['code'] ?? '');
    if (!$code) respond(['ok' => false, 'error' => 'That is not a valid ticket code.'], 400);

    $ticket = findTicket($conn, $code);
    if (!$ticket) respond(['ok' => false, 'error' => 'No ticket found with this code.'], 404);

    $event = findEvent($ticket['event_id']);
    respond(['ok' => true, 'ticket' => [
        'code'          => $ticket['ticket_code'],
        'name'          => $ticket['name'],
        'reg_no'        => maskRegNo($ticket['reg_no']),
        'event_id'      => (int)$ticket['event_id'],
        'event_title'   => $event['title'] ?? 'Unknown event',
        'checked_in_at' => $ticket['checked_in_at'],
    ]]);
}

// ---- Check-in (admin only) ----
requireAdmin();
$in = readJsonBody();
if (($in['action'] ?? '') !== 'checkin') respond(['ok' => false, 'error' => 'Unknown action.'], 400);

$code = cleanCode($in['code'] ?? '');
if (!$code) respond(['ok' => false, 'error' => 'That is not a valid ticket code.'], 400);

$ticket = findTicket($conn, $code);
if (!$ticket) respond(['ok' => false, 'error' => 'No ticket found with this code.'], 404);

$event = findEvent($ticket['event_id']);
$result = [
    'code'        => $ticket['ticket_code'],
    'name'        => $ticket['name'],
    'reg_no'      => $ticket['reg_no'],
    'event_title' => $event['title'] ?? 'Unknown event',
];

if ($ticket['checked_in_at']) {
    respond(['ok' => true, 'status' => 'already', 'checked_in_at' => $ticket['checked_in_at'], 'ticket' => $result]);
}

// Only update if still NULL, so two scanners can't both check the same ticket in.
$stmt = $conn->prepare('UPDATE registrations SET checked_in_at = NOW() WHERE id = ? AND checked_in_at IS NULL');
$stmt->bind_param('i', $ticket['id']);
$stmt->execute();

$updated = findTicket($conn, $code); // read the time MySQL stored
respond(['ok' => true, 'status' => 'checked_in', 'checked_in_at' => $updated['checked_in_at'], 'ticket' => $result]);
