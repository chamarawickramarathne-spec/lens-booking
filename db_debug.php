<?php
$host = "localhost";
$database_name = "lens_booking_pro";
$username = "test";
$password = "FZ8V6dtvf2kNG0";

try {
    $conn = new PDO("mysql:host=$host;dbname=$database_name", $username, $password);
    
    echo "--- ACCESS LEVELS TABLE ---\n";
    $stmt = $conn->query("SELECT * FROM access_levels");
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "ID: " . $row['id'] . " | Name: " . $row['level_name'] . " | Clients: " . ($row['max_clients'] ?? 'NULL') . " | Bookings: " . ($row['max_bookings'] ?? 'NULL') . " | Storage: " . $row['max_storage_gb'] . "GB\n";
    }
    
    echo "\n--- USERS CHECK ---\n";
    $stmt = $conn->query("SELECT id, email, access_level_id FROM users WHERE email='chamara.wickramarathne@gmail.com'");
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "ID: " . $row['id'] . " | Email: " . $row['email'] . " | Access Level ID: " . $row['access_level_id'] . "\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
