<?php
// Admin login / logout / status.
//   GET  api/auth.php                    -> { loggedIn, username }
//   POST api/auth.php  {action:"login", username, password}
//   POST api/auth.php  {action:"logout"}

require 'config.php';
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    respond([
        'ok' => true,
        'loggedIn' => !empty($_SESSION['admin']),
        'username' => $_SESSION['admin'] ?? null
    ]);
}

$in = readJsonBody();
$action = $in['action'] ?? '';

if ($action === 'logout') {
    session_destroy();
    respond(['ok' => true]);
}

if ($action === 'login') {
    $username = trim($in['username'] ?? '');
    $password = $in['password'] ?? '';

    $stmt = $conn->prepare('SELECT password FROM admins WHERE username = ?');
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $stmt->bind_result($hash);
    $found = $stmt->fetch();
    $stmt->close();

    // password_verify compares the typed password with the stored hash.
    if ($found && password_verify($password, $hash)) {
        session_regenerate_id(true);
        $_SESSION['admin'] = $username;
        respond(['ok' => true, 'username' => $username]);
    }
    respond(['ok' => false, 'error' => 'Wrong username or password.'], 401);
}

respond(['ok' => false, 'error' => 'Unknown action.'], 400);
