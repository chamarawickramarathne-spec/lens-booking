<?php
/**
 * Migration: Add price and discount columns to access_levels table
 */
require_once __DIR__ . '/../api/config/database.php';

header("Content-Type: application/json");

try {
    $database = new Database();
    $db = $database->getConnection();

    // 1. Add 'package_price' column if not exists
    $checkPrice = $db->query("SHOW COLUMNS FROM access_levels LIKE 'package_price'");
    if ($checkPrice->rowCount() == 0) {
        $db->exec("ALTER TABLE access_levels ADD COLUMN package_price DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Package monthly price in LKR' AFTER max_storage_gb");
        echo json_encode(["status" => "success", "message" => "Column 'package_price' added."]) . "\n";
    } else {
        echo json_encode(["status" => "info", "message" => "Column 'package_price' already exists."]) . "\n";
    }

    // 2. Add 'discount_percentage' column if not exists
    $checkDiscount = $db->query("SHOW COLUMNS FROM access_levels LIKE 'discount_percentage'");
    if ($checkDiscount->rowCount() == 0) {
        $db->exec("ALTER TABLE access_levels ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Discount percentage (e.g. 10 = 10%)' AFTER package_price");
        echo json_encode(["status" => "success", "message" => "Column 'discount_percentage' added."]) . "\n";
    } else {
        echo json_encode(["status" => "info", "message" => "Column 'discount_percentage' already exists."]) . "\n";
    }

    echo json_encode(["status" => "success", "message" => "Migration completed. You can now update price and discount values from the admin panel."]) . "\n";

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]) . "\n";
}
?>
