<?php
// Shared setup for every API file: database connection + JSON helpers.

// Database settings. Docker passes these in as environment variables;
// otherwise the XAMPP defaults are used (root user, no password).
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');
define('DB_NAME', getenv('DB_NAME') ?: 'campus_event_hub');

// Every response from the API is JSON.
header('Content-Type: application/json; charset=utf-8');

mysqli_report(MYSQLI_REPORT_OFF);
$conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Database connection failed. Is MySQL running in XAMPP?']);
    exit;
}
$conn->set_charset('utf8mb4');

// Send a JSON response and stop the script.
function respond($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

// Read the JSON body sent by fetch() and turn it into a PHP array.
function readJsonBody() {
    $body = json_decode(file_get_contents('php://input'), true);
    return is_array($body) ? $body : [];
}

// Load the event list from data/events.json (the same file the frontend uses).
function loadEvents() {
    $json = file_get_contents(__DIR__ . '/../data/events.json');
    return json_decode($json, true) ?: [];
}

function findEvent($id) {
    foreach (loadEvents() as $event) {
        if ($event['id'] === (int)$id) return $event;
    }
    return null;
}

// Admin-only endpoints call this first.
function requireAdmin() {
    if (session_status() === PHP_SESSION_NONE) session_start();
    if (empty($_SESSION['admin'])) {
        respond(['ok' => false, 'error' => 'Please log in as admin.'], 401);
    }
}
