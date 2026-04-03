<?php
require_once __DIR__ . '/config/database.php';
$db = (new Database())->getConnection();
$stmt = $db->query("SELECT id, email, full_name, access_level_id FROM users");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<h1>Users in database</h1>";
echo "<table border='1'>";
echo "<tr><th>ID</th><th>Email</th><th>Name</th><th>Access Level ID</th></tr>";
foreach ($users as $user) {
    echo "<tr>";
    echo "<td>" . $user['id'] . "</td>";
    echo "<td>" . $user['email'] . "</td>";
    echo "<td>" . $user['full_name'] . "</td>";
    echo "<td>" . $user['access_level_id'] . "</td>";
    echo "</tr>";
}
echo "</table>";

$stmt = $db->query("SELECT * FROM access_levels");
$levels = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<h1>Access Levels</h1>";
echo "<pre>";
print_r($levels);
echo "</pre>";
