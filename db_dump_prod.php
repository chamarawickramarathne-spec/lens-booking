<?php
$host = "localhost";
$database_name = "hiresmcq_lensbooking";
$username = "hiresmcq_lensrun";
$password = "Q}Pf;9#?^djT)MT";

try {
    $conn = new PDO("mysql:host=$host;dbname=$database_name", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->exec("set names utf8");

    $stmt = $conn->query("SELECT * FROM access_levels");
    $levels = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Production Access Levels:\n";
    echo json_encode($levels, JSON_PRETTY_PRINT);

} catch (PDOException $exception) {
    echo "Connection error: " . $exception->getMessage() . "\n";
    exit(1);
}
?>
