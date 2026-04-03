<?php
require_once __DIR__ . '/api/config/database.php';
$db = (new Database())->getConnection();
$stmt = $db->query("SELECT * FROM access_levels");
$levels = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($levels, JSON_PRETTY_PRINT);
?>
