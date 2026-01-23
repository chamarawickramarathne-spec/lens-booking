<?php
/**
 * Reset admin password
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config/database.php';

$database = new Database();
$conn = $database->getConnection();

$email = "admin@lensbooking.com";
$new_password = "admin123";

$password_hash = password_hash($new_password, PASSWORD_DEFAULT);

$query = "UPDATE users SET password_hash = :password_hash WHERE email = :email";
$stmt = $conn->prepare($query);
$stmt->bindParam(":password_hash", $password_hash);
$stmt->bindParam(":email", $email);

if ($stmt->execute()) {
    echo "✓ Password reset successful!\n";
    echo "Email: $email\n";
    echo "New Password: $new_password\n";
} else {
    echo "✗ Failed to reset password\n";
}
?>
