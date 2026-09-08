<?php
/**
 * submit-contact.php — handles the "Tell us what you're building" form.
 *
 * What it does, in order:
 *   1) Saves the message into a MySQL table (creates the table itself the first time it runs).
 *   2) Emails a copy of the message to the studio.
 *
 * ------------------------------------------------------------------
 * Right now this is set up to test on WampServer (localhost, user
 * "root", empty password) with the database you already created.
 * When you move the site to Hostinger, just change the 4 values
 * below to the ones hPanel gives you for the real database.
 * ------------------------------------------------------------------
 */

$DB_HOST = "localhost";
$DB_NAME = "bd_sd";
$DB_USER = "root";
$DB_PASS = "";

$NOTIFY_EMAIL = "rafaelernesto930@gmail.com";
$SITE_FROM    = "no-reply@stonedsigninc.com"; // once the site is live on its own domain, change this to an address @that domain

// Set to true only while testing locally. It shows the real error (instead of
// a generic one) if something fails, and it writes every attempted email to
// assets/mail-log/ instead of relying on real mail — WampServer doesn't send
// real email by default, so this lets you confirm the form is working end to
// end without needing a mail server. Set back to false before publishing.
$LOCAL_TEST_MODE = true;

/* ---------------- no need to edit anything below this line ---------------- */

if ($LOCAL_TEST_MODE) {
    ini_set('display_errors', '0'); // keep raw PHP errors out of the JSON response
    error_reporting(E_ALL);
}

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
    echo json_encode([
        'success' => false,
        'error'   => 'database_error',
        'detail'  => $LOCAL_TEST_MODE ? $e->getMessage() : null,
    ]);
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

$mailSent = @mail($NOTIFY_EMAIL, $subject, $body, $headers);

if (!$mailSent && $LOCAL_TEST_MODE) {
    // WampServer has no mail server configured out of the box, so mail()
    // normally fails silently here. Instead of losing the message, save it
    // to a local log file you can open to confirm what would have been sent.
    $logDir = __DIR__ . '/assets/mail-log';
    if (!is_dir($logDir)) { @mkdir($logDir, 0777, true); }
    $entry = "==== " . date('Y-m-d H:i:s') . " ====\n" .
             "To: {$NOTIFY_EMAIL}\nSubject: {$subject}\n\n{$body}\n\n";
    @file_put_contents($logDir . '/mail-log.txt', $entry, FILE_APPEND);
}

echo json_encode(['success' => true, 'firstName' => explode(' ', $name)[0]]);
