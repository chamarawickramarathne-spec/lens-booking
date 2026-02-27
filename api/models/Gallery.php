<?php
/**
 * Gallery Model
 * Handles gallery-related database operations
 */

class Gallery
{
    private $conn;
    private $table_name = "galleries";
    private $images_table = "gallery_images";

    public $id;
    public $user_id;
    public $booking_id;
    public $gallery_name;
    public $description;
    public $gallery_date;
    public $cover_image;
    public $is_public;
    public $password_protected;
    public $gallery_password;
    public $download_enabled;
    public $expiry_date;
    public $created_at;
    public $updated_at;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    /**
     * Create new gallery
     */
    public function create()
    {
        $query = "INSERT INTO " . $this->table_name . " 
                 SET user_id=:user_id, booking_id=:booking_id, gallery_name=:gallery_name, 
                     description=:description, gallery_date=:gallery_date, cover_image=:cover_image,
                     is_public=:is_public, password_protected=:password_protected, 
                     gallery_password=:gallery_password, download_enabled=:download_enabled, 
                     expiry_date=:expiry_date";

        $stmt = $this->conn->prepare($query);

        // Bind values
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":booking_id", $this->booking_id);
        $stmt->bindParam(":gallery_name", $this->gallery_name);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":gallery_date", $this->gallery_date);
        $stmt->bindParam(":cover_image", $this->cover_image);
        $stmt->bindValue(":is_public", $this->is_public ? 1 : 0);
        $stmt->bindValue(":password_protected", $this->password_protected ? 1 : 0);
        $stmt->bindParam(":gallery_password", $this->gallery_password);
        $stmt->bindValue(":download_enabled", $this->download_enabled ? 1 : 0);
        $stmt->bindParam(":expiry_date", $this->expiry_date);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        return false;
    }

    /**
     * Get all galleries for a user
     */
    public function getByUserId($user_id)
    {
        $query = "SELECT g.*, b.title as booking_title, 
                  (SELECT COUNT(*) FROM gallery_images WHERE gallery_id = g.id) as image_count,
                  (SELECT image_url FROM gallery_images WHERE gallery_id = g.id ORDER BY image_order ASC, created_at ASC LIMIT 1) as first_image
                  FROM " . $this->table_name . " g
                  LEFT JOIN bookings b ON g.booking_id = b.id
                  WHERE g.user_id = :user_id 
                  ORDER BY g.created_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get gallery by ID
     */
    public function getById($id, $user_id)
    {
        $query = "SELECT g.*, b.title as booking_title,
                  (SELECT image_url FROM gallery_images WHERE gallery_id = g.id ORDER BY image_order ASC, created_at ASC LIMIT 1) as first_image 
                  FROM " . $this->table_name . " g
                  LEFT JOIN bookings b ON g.booking_id = b.id
                  WHERE g.id = :id AND g.user_id = :user_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get public gallery by ID
     */
    public function getPublicById($id)
    {
        $query = "SELECT g.*, b.title as booking_title,
                  (SELECT image_url FROM gallery_images WHERE gallery_id = g.id ORDER BY image_order ASC, created_at ASC LIMIT 1) as first_image 
                  FROM " . $this->table_name . " g
                  LEFT JOIN bookings b ON g.booking_id = b.id
                  WHERE g.id = :id AND g.is_public = 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Update gallery
     */
    public function update()
    {
        $query = "UPDATE " . $this->table_name . " 
                 SET gallery_name=:gallery_name, description=:description, 
                     gallery_date=:gallery_date, cover_image=:cover_image,
                     is_public=:is_public, password_protected=:password_protected, 
                     gallery_password=:gallery_password, download_enabled=:download_enabled, 
                     expiry_date=:expiry_date, updated_at=CURRENT_TIMESTAMP
                 WHERE id=:id AND user_id=:user_id";

        $stmt = $this->conn->prepare($query);

        // Bind values
        $stmt->bindParam(":gallery_name", $this->gallery_name);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":gallery_date", $this->gallery_date);
        $stmt->bindParam(":cover_image", $this->cover_image);
        $stmt->bindValue(":is_public", $this->is_public ? 1 : 0);
        $stmt->bindValue(":password_protected", $this->password_protected ? 1 : 0);
        $stmt->bindParam(":gallery_password", $this->gallery_password);
        $stmt->bindValue(":download_enabled", $this->download_enabled ? 1 : 0);
        $stmt->bindParam(":expiry_date", $this->expiry_date);
        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":user_id", $this->user_id);

        return $stmt->execute();
    }

    /**
     * Delete gallery
     */
    public function delete($id, $user_id)
    {
        $query = "DELETE FROM " . $this->table_name . " 
                 WHERE id = :id AND user_id = :user_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(":user_id", $user_id);

        return $stmt->execute();
    }

    /**
     * Gallery Images methods
     */
    public function addImage($gallery_id, $image_url, $image_name = null, $file_size = null)
    {
        $query = "INSERT INTO " . $this->images_table . " 
                 SET gallery_id=:gallery_id, image_url=:image_url, 
                     image_name=:image_name, file_size=:file_size";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":gallery_id", $gallery_id);
        $stmt->bindParam(":image_url", $image_url);
        $stmt->bindParam(":image_name", $image_name);
        $stmt->bindParam(":file_size", $file_size);

        return $stmt->execute();
    }

    public function getImages($gallery_id)
    {
        $query = "SELECT * FROM " . $this->images_table . " 
                 WHERE gallery_id = :gallery_id 
                 ORDER BY image_order ASC, created_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":gallery_id", $gallery_id);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function deleteImage($image_id, $gallery_id)
    {
        $query = "DELETE FROM " . $this->images_table . " 
                 WHERE id = :id AND gallery_id = :gallery_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $image_id);
        $stmt->bindParam(":gallery_id", $gallery_id);

        return $stmt->execute();
    }
}
