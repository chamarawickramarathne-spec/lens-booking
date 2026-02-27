<?php
require_once __DIR__ . '/../api/config/database.php';
header("Content-Type: application/json");
try {
    $database = new Database();
    $db = $database->getConnection();
    $stmt = $db->query("SELECT * FROM gallery_images LIMIT 10");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>