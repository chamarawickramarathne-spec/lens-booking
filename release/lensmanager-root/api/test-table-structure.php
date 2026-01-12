<?php
require_once 'config/database.php';

$db = new Database();
$conn = $db->getConnection();

$stmt = $conn->query('DESCRIBE photographers');
echo "Photographers Table Structure:\n";
echo str_repeat("=", 80) . "\n";
printf("%-30s %-20s %-10s %-15s\n", "Field", "Type", "Null", "Default");
echo str_repeat("-", 80) . "\n";

while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    printf("%-30s %-20s %-10s %-15s\n", 
        $row['Field'], 
        $row['Type'], 
        $row['Null'], 
        $row['Default'] ?? 'NULL'
    );
}
?>
