<?php
$host = "localhost";
$database_name = "lens_booking_pro";
$username = "test";
$password = "FZ8V6dtvf2kNG0";

try {
    $conn = new PDO("mysql:host=$host;dbname=$database_name", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->exec("set names utf8");

    require_once __DIR__ . '/api/models/AccessLevel.php';
    $accessLevelModel = new AccessLevel($conn);
    
    // User Chamara (ID 2 based on previous check)
    $info = $accessLevelModel->getUserAccessInfo(2);
    
    header('Content-Type: application/json');
    echo json_encode($info, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
