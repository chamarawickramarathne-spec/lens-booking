<?php
$host = "localhost";
$database_name = "lens_booking_pro";
$username = "test";
$password = "FZ8V6dtvf2kNG0";

try {
    $conn = new PDO(
        "mysql:host=" . $host . ";dbname=" . $database_name,
        $username,
        $password
    );
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->exec("set names utf8");

    $stmt = $conn->query("SELECT * FROM access_levels");
    $levels = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Access Levels:\n";
    echo json_encode($levels, JSON_PRETTY_PRINT);
    echo "\n\nUser Check (chamara.wickramarathne@gmail.com):\n";
    $stmt = $conn->prepare("SELECT id, email, full_name, access_level_id FROM users WHERE email = :email");
    $stmt->execute(['email' => 'chamara.wickramarathne@gmail.com']);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode($user, JSON_PRETTY_PRINT);

} catch (PDOException $exception) {
    echo "Connection error: " . $exception->getMessage() . "\n";
    exit(1);
}
?>
