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

// Databases created before QR tickets were added don't have the ticket columns.
// Add them automatically (and give old registrations a ticket code) so nobody
// has to re-import database.sql.
function ensureSchema($conn) {
    $res = $conn->query("SHOW COLUMNS FROM registrations LIKE 'ticket_code'");
    if ($res && $res->num_rows > 0) return;
    $conn->query("ALTER TABLE registrations
                    ADD COLUMN ticket_code VARCHAR(12) NULL,
                    ADD COLUMN checked_in_at TIMESTAMP NULL DEFAULT NULL");
    $conn->query("UPDATE registrations
                     SET ticket_code = CONCAT('CH-', UPPER(SUBSTRING(MD5(CONCAT(id, reg_no, RAND())), 1, 8)))
                   WHERE ticket_code IS NULL");
    $conn->query("ALTER TABLE registrations ADD UNIQUE KEY uniq_ticket (ticket_code)");
}
ensureSchema($conn);

// A random, hard-to-guess ticket code such as CH-7F3A9C21.
function makeTicketCode() {
    return 'CH-' . strtoupper(bin2hex(random_bytes(4)));
}

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
