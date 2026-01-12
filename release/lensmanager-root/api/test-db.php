<?php
/**
 * Database connection test
 */

require_once 'config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if ($db) {
        // Test if users table exists
        $stmt = $db->query("SHOW TABLES LIKE 'users'");
        $table_exists = $stmt->rowCount() > 0;
        
        echo json_encode([
            "status" => "success",
            "message" => "Database connection successful",
            "users_table_exists" => $table_exists
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "Failed to connect to database"
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        "status" => "error",
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>