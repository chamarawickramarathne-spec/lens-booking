<?php
/**
 * Booking Model
 * Handles booking-related database operations
 */

class Booking {
    private $conn;
    private $table_name = "bookings";

    public $id;
    public $user_id;
    public $client_id;
    public $booking_date;
    public $booking_time;
    public $end_time;
    public $location;
    public $status;
    public $total_amount;
    public $paid_amount;
    public $deposit_amount;
    public $deposit_paid;
    public $special_requirements;
    public $notes;
    public $created_at;
    public $updated_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Create new booking
     */
    public function create() {
        // Check access level permissions
        require_once 'AccessLevel.php';
        $accessLevel = new AccessLevel($this->conn);
        
        if (!$accessLevel->canCreateBooking($this->user_id)) {
            return ['error' => 'limit_reached', 'message' => 'You have reached your booking limit for your current plan.'];
        }

        $query = "INSERT INTO " . $this->table_name . " 
                 SET user_id=:user_id, client_id=:client_id,
                     booking_date=:booking_date, booking_time=:booking_time, end_time=:end_time,
                     location=:location, status=:status,
                     total_amount=:total_amount, paid_amount=:paid_amount,
                     deposit_amount=:deposit_amount, deposit_paid=:deposit_paid,
                     special_requirements=:special_requirements, notes=:notes";

        $stmt = $this->conn->prepare($query);

        // Sanitize inputs
        $this->location = htmlspecialchars(strip_tags($this->location ?? ''));
        $this->status = htmlspecialchars(strip_tags($this->status ?? 'pending'));
        $this->special_requirements = htmlspecialchars(strip_tags($this->special_requirements ?? ''));
        $this->notes = htmlspecialchars(strip_tags($this->notes ?? ''));

        // Bind values
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":client_id", $this->client_id);
        $stmt->bindParam(":booking_date", $this->booking_date);
        $stmt->bindParam(":booking_time", $this->booking_time);
        $stmt->bindParam(":end_time", $this->end_time);
        $stmt->bindParam(":location", $this->location);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":total_amount", $this->total_amount);
        $stmt->bindParam(":paid_amount", $this->paid_amount);
        $stmt->bindParam(":deposit_amount", $this->deposit_amount);
        $stmt->bindParam(":deposit_paid", $this->deposit_paid);
        $stmt->bindParam(":special_requirements", $this->special_requirements);
        $stmt->bindParam(":notes", $this->notes);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        return false;
    }

    /**
     * Get all bookings for a user with client details
     */
    public function getByUserId($user_id) {
        $query = "SELECT b.*, c.full_name as client_name, c.email as client_email, c.phone as client_phone
                 FROM " . $this->table_name . " b
                 LEFT JOIN clients c ON b.client_id = c.id
                 WHERE b.user_id = :user_id 
                 ORDER BY b.booking_date DESC, b.booking_time DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get booking by ID
     */
    public function getById($id, $user_id) {
        $query = "SELECT b.*, c.full_name as client_name, c.email as client_email, c.phone as client_phone
                 FROM " . $this->table_name . " b
                 LEFT JOIN clients c ON b.client_id = c.id
                 WHERE b.id = :id AND b.user_id = :user_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }
        return false;
    }

    /**
     * Update booking
     */
    public function update() {
        $query = "UPDATE " . $this->table_name . " 
                 SET client_id=:client_id, booking_date=:booking_date,
                     booking_time=:booking_time, end_time=:end_time, location=:location,
                     total_amount=:total_amount, paid_amount=:paid_amount,
                     deposit_amount=:deposit_amount, deposit_paid=:deposit_paid,
                     status=:status, special_requirements=:special_requirements, notes=:notes,
                     updated_at=CURRENT_TIMESTAMP
                 WHERE id=:id AND user_id=:user_id";

        $stmt = $this->conn->prepare($query);

        // Sanitize inputs
        $this->location = htmlspecialchars(strip_tags($this->location ?? ''));
        $this->status = htmlspecialchars(strip_tags($this->status ?? 'pending'));
        $this->special_requirements = htmlspecialchars(strip_tags($this->special_requirements ?? ''));
        $this->notes = htmlspecialchars(strip_tags($this->notes ?? ''));

        // Bind values
        $stmt->bindParam(":client_id", $this->client_id);
        $stmt->bindParam(":booking_date", $this->booking_date);
        $stmt->bindParam(":booking_time", $this->booking_time);
        $stmt->bindParam(":end_time", $this->end_time);
        $stmt->bindParam(":location", $this->location);
        $stmt->bindParam(":total_amount", $this->total_amount);
        $stmt->bindParam(":paid_amount", $this->paid_amount);
        $stmt->bindParam(":deposit_amount", $this->deposit_amount);
        $stmt->bindParam(":deposit_paid", $this->deposit_paid);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":special_requirements", $this->special_requirements);
        $stmt->bindParam(":notes", $this->notes);
        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":user_id", $this->user_id);

        return $stmt->execute();
    }

    /**
     * Update booking status
     */
    public function updateStatus($id, $user_id, $status) {
        $query = "UPDATE " . $this->table_name . " 
                 SET status=:status, updated_at=CURRENT_TIMESTAMP
                 WHERE id=:id AND user_id=:user_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":status", $status);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(":user_id", $user_id);

        return $stmt->execute();
    }

    /**
     * Delete booking
     */
    public function delete($id, $user_id) {
        $query = "DELETE FROM " . $this->table_name . " 
                 WHERE id = :id AND user_id = :user_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(":user_id", $user_id);

        return $stmt->execute();
    }

    /**
     * Get dashboard statistics
     */
    public function getDashboardStats($user_id) {
        $query = "SELECT 
                    COUNT(*) as total_bookings,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
                    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
                    SUM(total_amount) as total_revenue,
                    SUM(deposit_amount) as total_deposits
                 FROM " . $this->table_name . " 
                 WHERE user_id = :user_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
?>