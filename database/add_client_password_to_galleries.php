<?php
require_once __DIR__ . '/../api/config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    $sql = "ALTER TABLE galleries ADD COLUMN client_password VARCHAR(255) DEFAULT NULL AFTER gallery_password";
    $db->exec($sql);

    echo "Migration successful: Column 'client_password' added to 'galleries' table.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Migration skipped: Column 'client_password' already exists.\n";
    } else {
        echo "Migration failed: " . $e->getMessage() . "\n";
    }
}
?>
