<?php
/**
 * Get Database Structure
 * Outputs all table fields and their types
 */

require_once 'config/database.php';

$database = new Database();
$conn = $database->getConnection();

$tables = ['users', 'clients', 'bookings', 'galleries', 'gallery_images', 'invoices', 'payments'];

foreach ($tables as $table) {
    echo "\n=== TABLE: $table ===\n";
    
    try {
        $stmt = $conn->query("DESCRIBE $table");
        $fields = [];
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $fields[] = $row['Field'];
        }
        
        echo implode(',', $fields) . "\n";
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
}

echo "\n=== DONE ===\n";
?>
