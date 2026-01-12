<?php
/**
 * Test script to verify email verification setup
 */

require_once 'config/database.php';

echo "=== Email Verification System Test ===\n\n";

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    // Check if columns exist
    echo "1. Checking database structure...\n";
    $stmt = $conn->query('DESCRIBE photographers');
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $required_columns = ['active_status', 'verification_token', 'token_expires_at'];
    $missing_columns = [];
    
    foreach ($required_columns as $col) {
        if (in_array($col, $columns)) {
            echo "   ✓ Column '$col' exists\n";
        } else {
            echo "   ✗ Column '$col' MISSING\n";
            $missing_columns[] = $col;
        }
    }
    
    if (!empty($missing_columns)) {
        echo "\n⚠ WARNING: Missing columns detected!\n";
        echo "Please run the migration file: database/add_email_verification.sql\n\n";
    } else {
        echo "\n✓ All required columns exist!\n\n";
    }
    
    // Check if User model has new methods
    echo "2. Checking User model...\n";
    require_once 'models/User.php';
    $user = new User($conn);
    
    $required_methods = ['verifyEmail', 'resendVerification', 'getByEmail'];
    foreach ($required_methods as $method) {
        if (method_exists($user, $method)) {
            echo "   ✓ Method '$method' exists\n";
        } else {
            echo "   ✗ Method '$method' MISSING\n";
        }
    }
    
    // Check if EmailUtility exists
    echo "\n3. Checking EmailUtility...\n";
    if (file_exists('utils/EmailUtility.php')) {
        echo "   ✓ EmailUtility.php exists\n";
        require_once 'utils/EmailUtility.php';
        $emailUtil = new EmailUtility();
        
        if (method_exists($emailUtil, 'sendVerificationEmail')) {
            echo "   ✓ sendVerificationEmail method exists\n";
        }
        if (method_exists($emailUtil, 'sendWelcomeEmail')) {
            echo "   ✓ sendWelcomeEmail method exists\n";
        }
    } else {
        echo "   ✗ EmailUtility.php MISSING\n";
    }
    
    // Check existing users
    echo "\n4. Checking existing users...\n";
    $stmt = $conn->query('SELECT COUNT(*) as total, 
                          SUM(CASE WHEN active_status = 1 THEN 1 ELSE 0 END) as active,
                          SUM(CASE WHEN active_status = 0 THEN 1 ELSE 0 END) as inactive
                          FROM photographers');
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "   Total users: {$stats['total']}\n";
    echo "   Active users: {$stats['active']}\n";
    echo "   Inactive users: {$stats['inactive']}\n";
    
    echo "\n=== Test Complete ===\n";
    echo "\nNext Steps:\n";
    if (!empty($missing_columns)) {
        echo "1. Run database migration: database/add_email_verification.sql\n";
        echo "2. Re-run this test script\n";
    } else {
        echo "1. Test user registration\n";
        echo "2. Check email delivery\n";
        echo "3. Test email verification\n";
        echo "4. Test login with unverified account\n";
    }
    
} catch (Exception $e) {
    echo "\n✗ Error: " . $e->getMessage() . "\n";
}
?>
