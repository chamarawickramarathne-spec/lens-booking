<?php
/**
 * Booking Model
 * Handles booking-related database operations
 */

class Booking {
    private $conn;
    private $table_name = "bookings";

    public $id;
    public $photographer_id;
    public $client_id;
    public $booking_date;
    public $start_time;
    public $end_time;
    public $location;
    public $title;
    public $description;
    public $package_type;
    public $package_name;
    public $pre_shoot;
    public $album;
    public $total_amount;
    public $deposit_amount;
    public $status;
    public $created_at;
    public $updated_at;

    // Wedding-specific fields
    public $wedding_hotel_name;
    public $wedding_date;
    public $homecoming_hotel_name;
    public $homecoming_date;
    public $wedding_album; // boolean tinyint
    public $pre_shoot_album; // boolean tinyint
    public $family_album; // boolean tinyint
    public $group_photo_size;
    public $homecoming_photo_size;
    public $wedding_photo_sizes; // comma-separated list
    public $extra_thank_you_cards_qty;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Create new booking
     */
    public function create() {
        $query = "INSERT INTO " . $this->table_name . " 
                 SET photographer_id=:photographer_id, client_id=:client_id,
                     booking_date=:booking_date, start_time=:start_time, end_time=:end_time,
                     location=:location, title=:title, description=:description,
                     package_type=:package_type, package_name=:package_name,
                     pre_shoot=:pre_shoot, album=:album,
                     total_amount=:total_amount, deposit_amount=:deposit_amount,
                     status=:status,
                     wedding_hotel_name=:wedding_hotel_name, wedding_date=:wedding_date,
                     homecoming_hotel_name=:homecoming_hotel_name, homecoming_date=:homecoming_date,
                     wedding_album=:wedding_album, pre_shoot_album=:pre_shoot_album, family_album=:family_album,
                     group_photo_size=:group_photo_size, homecoming_photo_size=:homecoming_photo_size,
                     wedding_photo_sizes=:wedding_photo_sizes, extra_thank_you_cards_qty=:extra_thank_you_cards_qty";

        $stmt = $this->conn->prepare($query);

        // Sanitize inputs
        $this->location = htmlspecialchars(strip_tags($this->location));
        $this->title = htmlspecialchars(strip_tags($this->title));
        $this->description = htmlspecialchars(strip_tags($this->description));
        $this->package_type = htmlspecialchars(strip_tags($this->package_type));
        $this->package_name = htmlspecialchars(strip_tags($this->package_name));
        $this->status = htmlspecialchars(strip_tags($this->status));
    $this->wedding_hotel_name = $this->wedding_hotel_name !== null ? htmlspecialchars(strip_tags($this->wedding_hotel_name)) : null;
    $this->homecoming_hotel_name = $this->homecoming_hotel_name !== null ? htmlspecialchars(strip_tags($this->homecoming_hotel_name)) : null;
    $this->group_photo_size = $this->group_photo_size !== null ? htmlspecialchars(strip_tags($this->group_photo_size)) : null;
    $this->homecoming_photo_size = $this->homecoming_photo_size !== null ? htmlspecialchars(strip_tags($this->homecoming_photo_size)) : null;
    $this->wedding_photo_sizes = $this->wedding_photo_sizes !== null ? htmlspecialchars(strip_tags($this->wedding_photo_sizes)) : null;

        // Bind values
        $stmt->bindParam(":photographer_id", $this->photographer_id);
        $stmt->bindParam(":client_id", $this->client_id);
        $stmt->bindParam(":booking_date", $this->booking_date);
        $stmt->bindParam(":start_time", $this->start_time);
        $stmt->bindParam(":end_time", $this->end_time);
        $stmt->bindParam(":location", $this->location);
        $stmt->bindParam(":title", $this->title);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":package_type", $this->package_type);
        $stmt->bindParam(":package_name", $this->package_name);
        $stmt->bindParam(":pre_shoot", $this->pre_shoot);
        $stmt->bindParam(":album", $this->album);
        $stmt->bindParam(":total_amount", $this->total_amount);
        $stmt->bindParam(":deposit_amount", $this->deposit_amount);
        $stmt->bindParam(":status", $this->status);
    $stmt->bindParam(":wedding_hotel_name", $this->wedding_hotel_name);
    $stmt->bindParam(":wedding_date", $this->wedding_date);
    $stmt->bindParam(":homecoming_hotel_name", $this->homecoming_hotel_name);
    $stmt->bindParam(":homecoming_date", $this->homecoming_date);
    $stmt->bindParam(":wedding_album", $this->wedding_album);
    $stmt->bindParam(":pre_shoot_album", $this->pre_shoot_album);
    $stmt->bindParam(":family_album", $this->family_album);
    $stmt->bindParam(":group_photo_size", $this->group_photo_size);
    $stmt->bindParam(":homecoming_photo_size", $this->homecoming_photo_size);
    $stmt->bindParam(":wedding_photo_sizes", $this->wedding_photo_sizes);
    $stmt->bindParam(":extra_thank_you_cards_qty", $this->extra_thank_you_cards_qty);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        return false;
    }

    /**
     * Get all bookings for a user with client details
     */
    public function getByUserId($photographer_id) {
        $query = "SELECT b.*, c.name as client_name, c.email as client_email, c.phone as client_phone
                 FROM " . $this->table_name . " b
                 LEFT JOIN clients c ON b.client_id = c.id
                 WHERE b.photographer_id = :photographer_id 
                 ORDER BY b.booking_date DESC, b.start_time DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":photographer_id", $photographer_id);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get booking by ID
     */
    public function getById($id, $photographer_id) {
        $query = "SELECT b.*, c.name as client_name, c.email as client_email, c.phone as client_phone
                 FROM " . $this->table_name . " b
                 LEFT JOIN clients c ON b.client_id = c.id
                 WHERE b.id = :id AND b.photographer_id = :photographer_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(":photographer_id", $photographer_id);
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
                     start_time=:start_time, end_time=:end_time, location=:location,
                     title=:title, description=:description, package_type=:package_type,
                     package_name=:package_name, pre_shoot=:pre_shoot, album=:album,
                     total_amount=:total_amount, deposit_amount=:deposit_amount,
                     status=:status,
                     wedding_hotel_name=:wedding_hotel_name, wedding_date=:wedding_date,
                     homecoming_hotel_name=:homecoming_hotel_name, homecoming_date=:homecoming_date,
                     wedding_album=:wedding_album, pre_shoot_album=:pre_shoot_album, family_album=:family_album,
                     group_photo_size=:group_photo_size, homecoming_photo_size=:homecoming_photo_size,
                     wedding_photo_sizes=:wedding_photo_sizes, extra_thank_you_cards_qty=:extra_thank_you_cards_qty,
                     updated_at=CURRENT_TIMESTAMP
                 WHERE id=:id AND photographer_id=:photographer_id";

        $stmt = $this->conn->prepare($query);

        // Sanitize inputs
        $this->location = htmlspecialchars(strip_tags($this->location));
        $this->title = htmlspecialchars(strip_tags($this->title));
        $this->description = htmlspecialchars(strip_tags($this->description));
        $this->package_type = htmlspecialchars(strip_tags($this->package_type));
        $this->package_name = htmlspecialchars(strip_tags($this->package_name));
        $this->status = htmlspecialchars(strip_tags($this->status));
    $this->wedding_hotel_name = $this->wedding_hotel_name !== null ? htmlspecialchars(strip_tags($this->wedding_hotel_name)) : null;
    $this->homecoming_hotel_name = $this->homecoming_hotel_name !== null ? htmlspecialchars(strip_tags($this->homecoming_hotel_name)) : null;
    $this->group_photo_size = $this->group_photo_size !== null ? htmlspecialchars(strip_tags($this->group_photo_size)) : null;
    $this->homecoming_photo_size = $this->homecoming_photo_size !== null ? htmlspecialchars(strip_tags($this->homecoming_photo_size)) : null;
    $this->wedding_photo_sizes = $this->wedding_photo_sizes !== null ? htmlspecialchars(strip_tags($this->wedding_photo_sizes)) : null;

        // Bind values
        $stmt->bindParam(":client_id", $this->client_id);
        $stmt->bindParam(":booking_date", $this->booking_date);
        $stmt->bindParam(":start_time", $this->start_time);
        $stmt->bindParam(":end_time", $this->end_time);
        $stmt->bindParam(":location", $this->location);
        $stmt->bindParam(":title", $this->title);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":package_type", $this->package_type);
        $stmt->bindParam(":package_name", $this->package_name);
        $stmt->bindParam(":pre_shoot", $this->pre_shoot);
        $stmt->bindParam(":album", $this->album);
        $stmt->bindParam(":total_amount", $this->total_amount);
        $stmt->bindParam(":deposit_amount", $this->deposit_amount);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":photographer_id", $this->photographer_id);
    $stmt->bindParam(":wedding_hotel_name", $this->wedding_hotel_name);
    $stmt->bindParam(":wedding_date", $this->wedding_date);
    $stmt->bindParam(":homecoming_hotel_name", $this->homecoming_hotel_name);
    $stmt->bindParam(":homecoming_date", $this->homecoming_date);
    $stmt->bindParam(":wedding_album", $this->wedding_album);
    $stmt->bindParam(":pre_shoot_album", $this->pre_shoot_album);
    $stmt->bindParam(":family_album", $this->family_album);
    $stmt->bindParam(":group_photo_size", $this->group_photo_size);
    $stmt->bindParam(":homecoming_photo_size", $this->homecoming_photo_size);
    $stmt->bindParam(":wedding_photo_sizes", $this->wedding_photo_sizes);
    $stmt->bindParam(":extra_thank_you_cards_qty", $this->extra_thank_you_cards_qty);

        return $stmt->execute();
    }

    /**
     * Update booking status
     */
    public function updateStatus($id, $photographer_id, $status) {
        $query = "UPDATE " . $this->table_name . " 
                 SET status=:status, updated_at=CURRENT_TIMESTAMP
                 WHERE id=:id AND photographer_id=:photographer_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":status", $status);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(":photographer_id", $photographer_id);

        return $stmt->execute();
    }

    /**
     * Delete booking
     */
    public function delete($id, $photographer_id) {
        $query = "DELETE FROM " . $this->table_name . " 
                 WHERE id = :id AND photographer_id = :photographer_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(":photographer_id", $photographer_id);

        return $stmt->execute();
    }

    /**
     * Get dashboard statistics
     */
    public function getDashboardStats($photographer_id) {
        $query = "SELECT 
                    COUNT(*) as total_bookings,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
                    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
                    SUM(total_amount) as total_revenue,
                    SUM(deposit_amount) as total_deposits
                 FROM " . $this->table_name . " 
                 WHERE photographer_id = :photographer_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":photographer_id", $photographer_id);
        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
?>