<?php
require_once __DIR__ . '/api/config/database.php';

class DBLocal extends Database {
    public function __construct() {
        parent::__construct();
        // Force local for CLI
        $this->host = "localhost";
        $this->database_name = "lens_booking_pro";
        $this->username = "test";
        $this->password = "FZ8V6dtvf2kNG0";
    }
}

$db = (new DBLocal())->getConnection();
if (!$db) {
    echo "Failed to connect to database\n";
    exit(1);
}

$stmt = $db->query("SELECT * FROM access_levels");
$levels = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Access Levels:\n";
echo json_encode($levels, JSON_PRETTY_PRINT);
echo "\n\nUser Check (chamara.wickramarathne@gmail.com):\n";
$stmt = $db->prepare("SELECT id, email, full_name, access_level_id FROM users WHERE email = :email");
$stmt->execute(['email' => 'chamara.wickramarathne@gmail.com']);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
echo json_encode($user, JSON_PRETTY_PRINT);
?>
