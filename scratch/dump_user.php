<?php
require_once 'api/config/database.php';
$database = new Database();
$db = $database->getConnection();
$stmt = $db->query("SELECT u.* FROM users u JOIN galleries g ON u.id = g.user_id WHERE g.id = 3");
$user = $stmt->fetch(PDO::FETCH_ASSOC);
print_r($user);
?>
