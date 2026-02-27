<?php
/**
 * Fix image paths in database
 * Removes /api/ from existing image paths
 */
require_once __DIR__ . '/../api/config/database.php';

header("Content-Type: application/json");

try {
    $database = new Database();
    $db = $database->getConnection();

    // Update image_url to remove leading /api/
    $stmt = $db->prepare("UPDATE gallery_images SET image_url = REPLACE(image_url, '/api/', '') WHERE image_url LIKE '/api/uploads/%'");
    $stmt->execute();
    $count = $stmt->rowCount();

    echo json_encode(["status" => "success", "message" => "$count image paths fixed."]) . "\n";

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]) . "\n";
}
?>