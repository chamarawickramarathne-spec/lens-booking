<?php
/**
 * Migration runner for adding storage limits
 */
require_once __DIR__ . '/../api/config/database.php';

header("Content-Type: application/json");

try {
    $database = new Database();
    $db = $database->getConnection();

    // 1. Add column if it doesn't exist
    $checkColumn = $db->query("SHOW COLUMNS FROM access_levels LIKE 'max_storage_gb'");
    if ($checkColumn->rowCount() == 0) {
        $db->exec("ALTER TABLE access_levels ADD COLUMN max_storage_gb INT DEFAULT 5 COMMENT 'Limit in GB' AFTER max_bookings");
        echo json_encode(["status" => "success", "message" => "Column max_storage_gb added."]) . "\n";
    } else {
        echo json_encode(["status" => "info", "message" => "Column max_storage_gb already exists."]) . "\n";
    }

    // 2. Update limits
    $db->prepare("UPDATE access_levels SET max_storage_gb = 5 WHERE level_name = 'Free'")->execute();
    $db->prepare("UPDATE access_levels SET max_storage_gb = 10 WHERE level_name = 'Pro'")->execute();
    $db->prepare("UPDATE access_levels SET max_storage_gb = 20 WHERE level_name = 'Premium'")->execute();
    $db->prepare("UPDATE access_levels SET max_storage_gb = 50 WHERE level_name = 'Unlimited'")->execute();

    echo json_encode(["status" => "success", "message" => "Access level storage limits updated successfully."]) . "\n";

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]) . "\n";
}
?>