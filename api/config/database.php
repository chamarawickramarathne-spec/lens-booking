<?php
/**
 * Database Configuration
 * Configuration for lens_booking_pro database
 */

class Database
{
    private $host;
    private $database_name;
    private $username;
    private $password;
    private $conn;

    public function __construct()
    {
        // Detect environment
        $isLocal = (
            isset($_SERVER['HTTP_HOST']) && (
                $_SERVER['HTTP_HOST'] === 'localhost' ||
                $_SERVER['SERVER_NAME'] === 'localhost' ||
                $_SERVER['SERVER_ADDR'] === '127.0.0.1'
            )
        );

        if ($isLocal) {
            // Local Configuration
            $this->host = "localhost";
            $this->database_name = "lens_booking_pro";
            $this->username = "test";
            $this->password = "FZ8V6dtvf2kNG0";
        } else {
            // Production Configuration (Live)
            $this->host = "localhost";
            $this->database_name = "hiresmcq_lensbooking";
            $this->username = "hiresmcq_lensrun";
            $this->password = "Q}Pf;9#?^djT)MT";
        }
    }

    // Get database connection
    public function getConnection()
    {
        $this->conn = null;

        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->database_name,
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->exec("set names utf8");
        } catch (PDOException $exception) {
            error_log("Connection error: " . $exception->getMessage());
            return null;
        }

        return $this->conn;
    }
}
?>