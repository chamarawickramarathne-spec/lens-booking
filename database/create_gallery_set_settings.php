<?php
require_once __DIR__ . '/../api/config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    $sql = "CREATE TABLE IF NOT EXISTS gallery_set_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        gallery_id INT NOT NULL,
        set_name VARCHAR(100) NOT NULL,
        is_public TINYINT(1) DEFAULT 1,
        UNIQUE KEY gallery_set (gallery_id, set_name),
        FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    
    $db->exec($sql);

    echo "Migration successful: Table 'gallery_set_settings' created.\n";
} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
?>
