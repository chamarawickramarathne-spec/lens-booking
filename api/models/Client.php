<?php
/**
 * Client Model
 * Handles client-related database operations
 */

class Client {
    private $conn;
    private $table_name = "clients";

    public $id;
    public $user_id;
    public $name;
    public $email;
    public $phone;
    public $address;
    public $notes;
    public $status;
    public $second_contact;
    public $second_phone;
    public $created_at;
    public $updated_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Create new client
     */
    public function create() {
        $query = "INSERT INTO " . $this->table_name . " 
                 SET user_id=:user_id, name=:name, email=:email, phone=:phone,
                     address=:address, notes=:notes, status=:status, 
                     second_contact=:second_contact, second_phone=:second_phone";

        $stmt = $this->conn->prepare($query);

        // Sanitize inputs
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->email = htmlspecialchars(strip_tags($this->email));
        $this->phone = htmlspecialchars(strip_tags($this->phone));
        $this->address = htmlspecialchars(strip_tags($this->address));
        $this->notes = htmlspecialchars(strip_tags($this->notes));
        $this->status = htmlspecialchars(strip_tags($this->status));
        $this->second_contact = htmlspecialchars(strip_tags($this->second_contact));
        $this->second_phone = htmlspecialchars(strip_tags($this->second_phone));

        // Bind values
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":email", $this->email);
        $stmt->bindParam(":phone", $this->phone);
        $stmt->bindParam(":address", $this->address);
        $stmt->bindParam(":notes", $this->notes);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":second_contact", $this->second_contact);
        $stmt->bindParam(":second_phone", $this->second_phone);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        return false;
    }

    /**
     * Get all clients for a photographer
     */
    public function getByUserId($user_id) {
        $query = "SELECT * FROM " . $this->table_name . " 
                 WHERE user_id = :user_id 
                 ORDER BY created_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get client by ID
     */
    public function getById($id, $user_id) {
        $query = "SELECT * FROM " . $this->table_name . " 
                 WHERE id = :id AND user_id = :user_id";

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
     * Update client
     */
    public function update() {
        $query = "UPDATE " . $this->table_name . " 
                 SET name=:name, email=:email, phone=:phone, address=:address,
                     notes=:notes, status=:status, second_contact=:second_contact,
                     second_phone=:second_phone, updated_at=CURRENT_TIMESTAMP
                 WHERE id=:id AND user_id=:user_id";

        $stmt = $this->conn->prepare($query);

        // Sanitize inputs
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->email = htmlspecialchars(strip_tags($this->email));
        $this->phone = htmlspecialchars(strip_tags($this->phone));
        $this->address = htmlspecialchars(strip_tags($this->address));
        $this->notes = htmlspecialchars(strip_tags($this->notes));
        $this->status = htmlspecialchars(strip_tags($this->status));
        $this->second_contact = htmlspecialchars(strip_tags($this->second_contact));
        $this->second_phone = htmlspecialchars(strip_tags($this->second_phone));

        // Bind values
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":email", $this->email);
        $stmt->bindParam(":phone", $this->phone);
        $stmt->bindParam(":address", $this->address);
        $stmt->bindParam(":notes", $this->notes);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":second_contact", $this->second_contact);
        $stmt->bindParam(":second_phone", $this->second_phone);
        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":user_id", $this->user_id);

        return $stmt->execute();
    }

    /**
     * Delete client
     */
    public function delete($id, $user_id) {
    $query = "DELETE FROM " . $this->table_name . " 
         WHERE id = :id AND user_id = :user_id";

    $stmt = $this->conn->prepare($query);
    $stmt->bindParam(":id", $id);
    $stmt->bindParam(":user_id", $user_id);

    return $stmt->execute();
    }
}
?>