<?php
// Admin only.
//   GET    api/registrations.php              -> all registrations
//   GET    api/registrations.php?event_id=3   -> registrations for one event
//   DELETE api/registrations.php?id=12        -> remove one registration

require 'config.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    $stmt = $conn->prepare('DELETE FROM registrations WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    if ($stmt->affected_rows === 0) respond(['ok' => false, 'error' => 'Registration not found.'], 404);
    respond(['ok' => true]);
}

$sql = 'SELECT id, event_id, name, reg_no, email, phone, department, year, registered_at
        FROM registrations';

if (!empty($_GET['event_id'])) {
    $eventId = (int)$_GET['event_id'];
    $stmt = $conn->prepare($sql . ' WHERE event_id = ? ORDER BY registered_at DESC');
    $stmt->bind_param('i', $eventId);
} else {
    $stmt = $conn->prepare($sql . ' ORDER BY registered_at DESC');
}

$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

respond(['ok' => true, 'registrations' => $rows]);
