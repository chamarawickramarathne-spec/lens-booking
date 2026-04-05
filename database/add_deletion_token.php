<?php
/**
 * Migration runner for adding deletion tokens to users
 */
require_once __DIR__ . '/../api/config/database.php';

header("Content-Type: application/json");

try {
    $database = new Database();
    $db = $database->getConnection();

    // 1. Add deletion_token
    $checkColumn = $db->query("SHOW COLUMNS FROM users LIKE 'deletion_token'");
    if ($checkColumn->rowCount() == 0) {
        $db->exec("ALTER TABLE users ADD COLUMN deletion_token VARCHAR(255) DEFAULT NULL, ADD COLUMN deletion_token_expires_at TIMESTAMP NULL DEFAULT NULL");
        echo json_encode(["status" => "success", "message" => "Columns deletion_token and deletion_token_expires_at added."]) . "\n";
    } else {
        echo json_encode(["status" => "info", "message" => "Column deletion_token already exists."]) . "\n";
    }

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]) . "\n";
}
?>
