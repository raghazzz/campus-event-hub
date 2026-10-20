<?php
// GET api/counts.php
// Returns how many students registered for each event, e.g. { "1": 12, "3": 4 }
// The frontend uses this to show "seats left".

require 'config.php';

$result = $conn->query('SELECT event_id, COUNT(*) AS total FROM registrations GROUP BY event_id');

$counts = new stdClass(); // encodes as {} even when empty
while ($row = $result->fetch_assoc()) {
    $counts->{$row['event_id']} = (int)$row['total'];
}

respond(['ok' => true, 'counts' => $counts]);
