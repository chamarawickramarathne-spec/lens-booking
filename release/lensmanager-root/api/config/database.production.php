<?php
/**
 * Database Configuration for Production
 * Configuration for hiresmcq_lensbooking database
 */

class Database {
    private $host = "localhost";
    private $database_name = "hiresmcq_lensbooking";
    private $username = "hiresmcq_lensrun";
    private $password = "Q}Pf;9#?^djT)MT";
    private $conn;

    // Get database connection
    public function getConnection() {
        $this->conn = null;
        
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->database_name,
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->exec("set names utf8");
        } catch(PDOException $exception) {
            echo "Connection error: " . $exception->getMessage();
        }
        
        return $this->conn;
    }
}
?>
