<?php
/**
 * Manual User Activation Script
 * Use this to manually activate a user account if needed
 */

require_once 'config/database.php';

// Get email from command line or set it here
$email = $argv[1] ?? null;

if (!$email) {
    echo "Usage: php activate-user.php user@example.com\n";
    echo "Or edit this file and set the \$email variable\n\n";
    
    // Uncomment and set email here for direct execution:
    // $email = "user@example.com";
    
    if (!$email) {
        exit(1);
    }
}

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    // Check if user exists
    $check_query = "SELECT id, email, first_name, last_name, active_status 
                    FROM photographers 
                    WHERE email = :email";
    $stmt = $conn->prepare($check_query);
    $stmt->bindParam(':email', $email);
    $stmt->execute();
    
    if ($stmt->rowCount() === 0) {
        echo "✗ User with email '$email' not found.\n";
        exit(1);
    }
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Found user: {$user['first_name']} {$user['last_name']} ({$user['email']})\n";
    echo "Current status: " . ($user['active_status'] ? 'Active' : 'Inactive') . "\n\n";
    
    if ($user['active_status'] == 1) {
        echo "✓ User is already active. No action needed.\n";
        exit(0);
    }
    
    // Activate user
    $update_query = "UPDATE photographers 
                    SET active_status = 1,
                        verification_token = NULL,
                        token_expires_at = NULL
                    WHERE id = :id";
    $update_stmt = $conn->prepare($update_query);
    $update_stmt->bindParam(':id', $user['id']);
    
    if ($update_stmt->execute()) {
        echo "✓ User account activated successfully!\n";
        echo "User can now login with their email and password.\n";
    } else {
        echo "✗ Failed to activate user account.\n";
        exit(1);
    }
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>
