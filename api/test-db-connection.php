<?php
/**
 * Test Database Connection
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config/database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    if ($conn) {
        echo "✓ Database connection successful!\n";
        echo "Testing query...\n";
        
        // Test a simple query
        $stmt = $conn->query("SELECT 1 as test");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            echo "✓ Query execution successful!\n";
            echo "Database is working properly.\n";
        }
    } else {
        echo "✗ Failed to get database connection\n";
    }
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}
?>
