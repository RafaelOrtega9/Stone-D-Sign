<?php
/**
 * submit-contact.php — handles the "Tell us what you're building" form.
 *
 * What it does, in order:
 *   1) Saves the message into a MySQL table (creates the table itself the first time it runs).
 *   2) Emails a copy of the message to the studio.
 *
 * ------------------------------------------------------------------
 * SETUP — the only thing you need to do:
 * Create a MySQL database in your Hostinger control panel (hPanel →
 * Databases → MySQL Databases → Create new database), then paste the
 * 4 values it gives you below, replacing the empty quotes.
 * ------------------------------------------------------------------
 */

$DB_HOST = "localhost";   // Hostinger almost always uses "localhost" — leave as is unless hPanel shows something else
$DB_NAME = "";             // e.g. u123456789_stonedsign
$DB_USER = "";             // e.g. u123456789_stone
$DB_PASS = "";             // the password you set when creating the database

$NOTIFY_EMAIL = "rafaelernesto930@gmail.com";
$SITE_FROM    = "no-reply@stonedsigninc.com"; // once the site is live on its own domain, change this to an address @that domain

/* ---------------- no need to edit anything below this line ---------------- */

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'method_not_allowed']);
    exit;
}

function clean_field($v) {
    $v = trim(strip_tags((string) ($v ?? '')));
    // Strip line breaks so nothing can be smuggled into the email headers.
    return str_replace(["\r", "\n"], ' ', $v);
}

$name    = clean_field($_POST['name'] ?? '');
$phone   = clean_field($_POST['phone'] ?? '');
$project = clean_field($_POST['project'] ?? '');
$message = trim(strip_tags((string) ($_POST['message'] ?? '')));

if ($name === '' || $phone === '' || $project === '' || $message === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'missing_fields']);
    exit;
}

if ($DB_NAME === '' || $DB_USER === '') {
    // The database hasn't been configured yet — fail clearly instead of a confusing PHP error.
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'database_not_configured']);
    exit;
}

/* 1) Save to MySQL */
try {
    $mysqli = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);
    $mysqli->set_charset('utf8mb4');

    $mysqli->query("
        CREATE TABLE IF NOT EXISTS contact_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            phone VARCHAR(150) NOT NULL,
            project VARCHAR(150) NOT NULL,
            message TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    $stmt = $mysqli->prepare(
        "INSERT INTO contact_requests (name, phone, project, message) VALUES (?, ?, ?, ?)"
    );
    $stmt->bind_param('ssss', $name, $phone, $project, $message);
    $stmt->execute();
    $stmt->close();
    $mysqli->close();
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'database_error']);
    exit;
}

/* 2) Email a copy to the studio (best-effort — the request is already saved either way) */
$subject = "New project request — " . $name;
$body =
    "New request from the Stone D'Sign website:\n\n" .
    "Name: {$name}\n" .
    "Phone / email: {$phone}\n" .
    "Project type: {$project}\n\n" .
    "Message:\n{$message}\n";

$headers = "From: Stone D'Sign Website <{$SITE_FROM}>\r\n" .
           "Reply-To: {$SITE_FROM}\r\n" .
           "Content-Type: text/plain; charset=UTF-8";

@mail($NOTIFY_EMAIL, $subject, $body, $headers);

echo json_encode(['success' => true, 'firstName' => explode(' ', $name)[0]]);
