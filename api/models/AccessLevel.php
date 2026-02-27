<?php
/**
 * AccessLevel Model
 * Handles access level-related database operations
 */

class AccessLevel
{
    private $conn;
    private $table_name = "access_levels";

    public $id;
    public $level_name;
    public $max_clients;
    public $max_bookings;
    public $max_storage_gb;
    public $created_at;
    public $updated_at;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    /**
     * Get all access levels
     */
    public function getAll()
    {
        $query = "SELECT * FROM " . $this->table_name . " ORDER BY id ASC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get access level by ID
     */
    public function getById($id)
    {
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
    public function getUserAccessInfo($user_id)
    {
        // Get user's access level
        $query = "SELECT u.id as user_id, u.full_name, u.email, u.access_level_id, 
                        al.id as access_level_id, al.level_name, 
                        al.max_clients, al.max_bookings, al.max_storage_gb
                 FROM users u
                 LEFT JOIN access_levels al ON u.access_level_id = al.id
                 WHERE u.id = :user_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->execute();

        if ($stmt->rowCount() === 0) {
            return false;
        }

        $user_access = $stmt->fetch(PDO::FETCH_ASSOC);

        // Count current clients
        $client_query = "SELECT COUNT(*) as count FROM clients WHERE user_id = :user_id";
        $client_stmt = $this->conn->prepare($client_query);
        $client_stmt->bindParam(":user_id", $user_id);
        $client_stmt->execute();
        $client_count = $client_stmt->fetch(PDO::FETCH_ASSOC)['count'];

        // Count current bookings
        $booking_query = "SELECT COUNT(*) as count FROM bookings WHERE user_id = :user_id";
        $booking_stmt = $this->conn->prepare($booking_query);
        $booking_stmt->bindParam(":user_id", $user_id);
        $booking_stmt->execute();
        $booking_count = $booking_stmt->fetch(PDO::FETCH_ASSOC)['count'];

        // Get total storage usage (sum of file_size in bytes)
        $storage_query = "SELECT SUM(gi.file_size) as total_size 
                         FROM gallery_images gi 
                         JOIN galleries g ON gi.gallery_id = g.id 
                         WHERE g.user_id = :user_id";
        $storage_stmt = $this->conn->prepare($storage_query);
        $storage_stmt->bindParam(":user_id", $user_id);
        $storage_stmt->execute();
        $total_bytes = (int) ($storage_stmt->fetch(PDO::FETCH_ASSOC)['total_size'] ?? 0);

        // Convert to GB for comparison
        $total_gb = $total_bytes / (1024 * 1024 * 1024);

        // Map level names to storage limits if max_storage_gb is not in DB yet
        $max_storage = $user_access['max_storage_gb'];
        if ($max_storage === null) {
            $limits = [
                'Free' => 5,
                'Pro' => 10,
                'Premium' => 20,
                'Unlimited' => 50
            ];
            $max_storage = $limits[$user_access['level_name']] ?? 5;
        }

        return [
            'user_id' => $user_access['user_id'],
            'name' => $user_access['full_name'],
            'email' => $user_access['email'],
            'access_level' => [
                'id' => $user_access['access_level_id'],
                'name' => $user_access['level_name'],
                'max_clients' => $user_access['max_clients'],
                'max_bookings' => $user_access['max_bookings'],
                'max_storage_gb' => (float) $max_storage
            ],
            'current_usage' => [
                'clients' => (int) $client_count,
                'bookings' => (int) $booking_count,
                'storage_bytes' => (int) $total_bytes,
                'storage_gb' => round($total_gb, 4)
            ],
            'can_create' => [
                'client' => $user_access['max_clients'] === null || (int) $client_count < (int) $user_access['max_clients'],
                'booking' => $user_access['max_bookings'] === null || (int) $booking_count < (int) $user_access['max_bookings'],
                'storage' => $total_gb < (float) $max_storage
            ]
        ];
    }

    /**
     * Check if user can create a client
     */
    public function canCreateClient($user_id)
    {
        $access_info = $this->getUserAccessInfo($user_id);
        return $access_info && $access_info['can_create']['client'];
    }

    /**
     * Check if user can create a booking
     */
    public function canCreateBooking($user_id)
    {
        $access_info = $this->getUserAccessInfo($user_id);
        return $access_info && $access_info['can_create']['booking'];
    }
}
?>