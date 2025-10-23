<?php
/**
 * AccessLevel Model
 * Handles access level-related database operations
 */

class AccessLevel {
    private $conn;
    private $table_name = "access_levels";

    public $id;
    public $level_name;
    public $max_clients;
    public $max_bookings;
    public $created_at;
    public $updated_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Get all access levels
     */
    public function getAll() {
        $query = "SELECT * FROM " . $this->table_name . " ORDER BY id ASC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get access level by ID
     */
    public function getById($id) {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }
        return false;
    }

    /**
     * Get user's access level with current usage
     */
    public function getUserAccessInfo($user_id) {
        // Get user's access level
        $query = "SELECT u.id as user_id, u.first_name, u.email, u.user_access_level, 
                        al.id as access_level_id, al.level_name, 
                        al.max_clients, al.max_bookings
                 FROM photographers u
                 LEFT JOIN access_levels al ON u.user_access_level = al.id
                 WHERE u.id = :user_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            return false;
        }
        
        $user_access = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Count current clients
        $client_query = "SELECT COUNT(*) as count FROM clients WHERE photographer_id = :user_id";
        $client_stmt = $this->conn->prepare($client_query);
        $client_stmt->bindParam(":user_id", $user_id);
        $client_stmt->execute();
        $client_count = $client_stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Count current bookings
        $booking_query = "SELECT COUNT(*) as count FROM bookings WHERE photographer_id = :user_id";
        $booking_stmt = $this->conn->prepare($booking_query);
        $booking_stmt->bindParam(":user_id", $user_id);
        $booking_stmt->execute();
        $booking_count = $booking_stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        return [
            'user_id' => $user_access['user_id'],
            'name' => $user_access['first_name'],
            'email' => $user_access['email'],
            'role' => $user_access['user_access_level'],
            'access_level' => [
                'id' => $user_access['user_access_level'],
                'name' => $user_access['level_name'],
                'max_clients' => $user_access['max_clients'],
                'max_bookings' => $user_access['max_bookings']
            ],
            'current_usage' => [
                'clients' => (int)$client_count,
                'bookings' => (int)$booking_count
            ],
            'can_create' => [
                'client' => $user_access['max_clients'] === null || (int)$client_count < (int)$user_access['max_clients'],
                'booking' => $user_access['max_bookings'] === null || (int)$booking_count < (int)$user_access['max_bookings']
            ]
        ];
    }

    /**
     * Check if user can create a client
     */
    public function canCreateClient($user_id) {
        $access_info = $this->getUserAccessInfo($user_id);
        return $access_info && $access_info['can_create']['client'];
    }

    /**
     * Check if user can create a booking
     */
    public function canCreateBooking($user_id) {
        $access_info = $this->getUserAccessInfo($user_id);
        return $access_info && $access_info['can_create']['booking'];
    }
}
?>
