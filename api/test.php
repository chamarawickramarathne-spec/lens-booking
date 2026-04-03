<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/models/AccessLevel.php';
$db = (new Database())->getConnection();
$al = new AccessLevel($db);
// Default user ID = 1
echo json_encode($al->getUserAccessInfo(1), JSON_PRETTY_PRINT);
