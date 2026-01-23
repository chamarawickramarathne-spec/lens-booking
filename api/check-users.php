<?php
/**
 * Check if any users exist in database
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config/database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    if ($conn) {
        echo "✓ Database connected\n\n";
        
        // Check if users exist
        $stmt = $conn->query("SELECT id, email, full_name, role, email_verified FROM users");
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($users) > 0) {
            echo "Found " . count($users) . " user(s):\n\n";
            foreach ($users as $user) {
                echo "ID: " . $user['id'] . "\n";
                echo "Email: " . $user['email'] . "\n";
                echo "Name: " . $user['full_name'] . "\n";
                echo "Role: " . $user['role'] . "\n";
                echo "Verified: " . ($user['email_verified'] ? 'Yes' : 'No') . "\n";
                echo "---\n";
            }
        } else {
            echo "No users found in database.\n";
            echo "You need to create an account through the signup form.\n";
        }
    }
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}
?>
