<?php
/**
 * User Model
 * Handles user-related database operations
 */

class User {
    private $conn;
    private $table_name = "photographers";

    public $id;
    public $email;
    public $password_hash;
    public $full_name;
    public $phone;
    public $role;
    public $profile_picture;
    public $currency_type;
    public $business_name;
    public $business_email;
    public $business_phone;
    public $business_address;
    public $bio;
    public $website;
    public $portfolio_url;
    public $is_active;
    public $email_verified;
    public $created_at;
    public $updated_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Create new user
     */
    public function create() {
        // Split full_name into first_name and last_name
        $name_parts = explode(' ', trim($this->full_name), 2);
        $first_name = $name_parts[0];
        $last_name = isset($name_parts[1]) ? $name_parts[1] : '';

        // Generate verification token
        $verification_token = bin2hex(random_bytes(32));
        $token_expires_at = date('Y-m-d H:i:s', strtotime('+24 hours'));

        $query = "INSERT INTO " . $this->table_name . " 
                 SET email=:email, password=:password, first_name=:first_name, 
                     last_name=:last_name, phone=:phone, user_access_level=:user_access_level, 
                     profile_image=:profile_image, currency_type=:currency_type, active_date=:active_date,
                     active_status=:active_status, verification_token=:verification_token, 
                     token_expires_at=:token_expires_at";

        $stmt = $this->conn->prepare($query);

        // Sanitize inputs
        $this->email = htmlspecialchars(strip_tags($this->email));
        $first_name = htmlspecialchars(strip_tags($first_name));
        $last_name = htmlspecialchars(strip_tags($last_name));
        $this->phone = htmlspecialchars(strip_tags($this->phone));
        
        // Set user_access_level to 1 (links to access_levels table id)
        // 1 = Free tier (default for new photographers)
        $user_access_level = 1;

        // Hash password
        $password_hash = password_hash($this->password_hash, PASSWORD_DEFAULT);

        // Set defaults
        $profile_image = $this->profile_picture ?: '';
        $currency_type = 'USD'; // Default currency
        $active_date = date('Y-m-d'); // Set active_date to current date
        $active_status = 0; // Default to inactive until email verified

        // Bind values
        $stmt->bindParam(":email", $this->email);
        $stmt->bindParam(":password", $password_hash);
        $stmt->bindParam(":first_name", $first_name);
        $stmt->bindParam(":last_name", $last_name);
        $stmt->bindParam(":phone", $this->phone);
        $stmt->bindParam(":user_access_level", $user_access_level);
        $stmt->bindParam(":profile_image", $profile_image);
        $stmt->bindParam(":currency_type", $currency_type);
        $stmt->bindParam(":active_date", $active_date);
        $stmt->bindParam(":active_status", $active_status);
        $stmt->bindParam(":verification_token", $verification_token);
        $stmt->bindParam(":token_expires_at", $token_expires_at);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            $this->verification_token = $verification_token; // Store for email sending
            return true;
        }
        return false;
    }

    /**
     * Login user
     */
    public function login($email, $password) {
    $query = "SELECT id, email, password, first_name, last_name, phone, 
             user_access_level, profile_image, currency_type, 
             business_name, business_email, business_phone, business_address,
             bio, website, portfolio_url, active_status, created_at, updated_at
                 FROM " . $this->table_name . " 
                 WHERE email = :email";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (password_verify($password, $row['password'])) {
                // Check if account is active
                if (isset($row['active_status']) && $row['active_status'] == 0) {
                    return [
                        'error' => 'unverified',
                        'message' => 'Please check your email to confirm your signup and activate your account.'
                    ];
                }
                
                // Map the photographers table structure to expected user structure
                return [
                    'id' => $row['id'],
                    'email' => $row['email'],
                    'full_name' => trim($row['first_name'] . ' ' . $row['last_name']),
                    'phone' => $row['phone'],
                    'role' => $row['user_access_level'],
                    'profile_picture' => $row['profile_image'],
                    'currency_type' => $row['currency_type'] ?? 'USD',
                    'business_name' => $row['business_name'] ?? '',
                    'business_email' => $row['business_email'] ?? '',
                    'business_phone' => $row['business_phone'] ?? '',
                    'business_address' => $row['business_address'] ?? '',
                    'bio' => $row['bio'] ?? '',
                    'website' => $row['website'] ?? '',
                    'portfolio_url' => $row['portfolio_url'] ?? '',
                    'is_active' => $row['active_status'] ?? 1,
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['updated_at']
                ];
            }
        }
        return false;
    }

    /**
     * Get user by ID
     */
    public function getById($id) {
    $query = "SELECT id, email, first_name, last_name, phone, user_access_level, 
             profile_image, currency_type, business_name, business_email, 
             business_phone, business_address, bio, website, 
             portfolio_url, created_at, updated_at 
                 FROM " . $this->table_name . " 
                 WHERE id = :id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            // Map the photographers table structure to expected user structure
            return [
                'id' => $row['id'],
                'email' => $row['email'],
                'full_name' => trim($row['first_name'] . ' ' . $row['last_name']),
                'phone' => $row['phone'],
                'role' => $row['user_access_level'],
                'profile_picture' => $row['profile_image'],
                'currency_type' => $row['currency_type'] ?? 'USD',
                'business_name' => $row['business_name'] ?? '',
                'business_email' => $row['business_email'] ?? '',
                'business_phone' => $row['business_phone'] ?? '',
                'business_address' => $row['business_address'] ?? '',
                'bio' => $row['bio'] ?? '',
                'website' => $row['website'] ?? '',
                'portfolio_url' => $row['portfolio_url'] ?? '',
                'is_active' => 1, // Assume active if record exists
                'email_verified' => 0, // Default for existing schema
                'created_at' => $row['created_at'],
                'updated_at' => $row['updated_at']
            ];
        }
        return false;
    }

    /**
     * Update user
     */
    public function update() {
        // Split full_name into first_name and last_name
        $name_parts = explode(' ', trim($this->full_name), 2);
        $first_name = $name_parts[0];
        $last_name = isset($name_parts[1]) ? $name_parts[1] : '';

    $query = "UPDATE " . $this->table_name . " 
         SET first_name=:first_name, last_name=:last_name, phone=:phone, 
             profile_image=:profile_image, currency_type=:currency_type,
             business_name=:business_name, business_email=:business_email,
             business_phone=:business_phone, business_address=:business_address,
             bio=:bio, website=:website, 
             portfolio_url=:portfolio_url
         WHERE id=:id";

        $stmt = $this->conn->prepare($query);

        // Sanitize inputs
        $first_name = htmlspecialchars(strip_tags($first_name));
        $last_name = htmlspecialchars(strip_tags($last_name));
        $this->phone = htmlspecialchars(strip_tags($this->phone ?? ''));
        $this->business_name = htmlspecialchars(strip_tags($this->business_name ?? ''));
        $this->business_email = htmlspecialchars(strip_tags($this->business_email ?? ''));
        $this->business_phone = htmlspecialchars(strip_tags($this->business_phone ?? ''));
        $this->business_address = htmlspecialchars(strip_tags($this->business_address ?? ''));
        $this->bio = htmlspecialchars(strip_tags($this->bio ?? ''));
        $this->website = htmlspecialchars(strip_tags($this->website ?? ''));
        $this->portfolio_url = htmlspecialchars(strip_tags($this->portfolio_url ?? ''));

        // Bind values
        $stmt->bindParam(":first_name", $first_name);
        $stmt->bindParam(":last_name", $last_name);
        $stmt->bindParam(":phone", $this->phone);
    $stmt->bindParam(":profile_image", $this->profile_picture);
    $stmt->bindParam(":currency_type", $this->currency_type);
        $stmt->bindParam(":business_name", $this->business_name);
        $stmt->bindParam(":business_email", $this->business_email);
        $stmt->bindParam(":business_phone", $this->business_phone);
        $stmt->bindParam(":business_address", $this->business_address);
        $stmt->bindParam(":bio", $this->bio);
        $stmt->bindParam(":website", $this->website);
        $stmt->bindParam(":portfolio_url", $this->portfolio_url);
        $stmt->bindParam(":id", $this->id);

        return $stmt->execute();
    }

    /**
     * Check if email exists
     */
    public function emailExists($email) {
        $query = "SELECT id FROM " . $this->table_name . " WHERE email = :email";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();
        
        return $stmt->rowCount() > 0;
    }

    /**
     * Get user by email
     */
    public function getByEmail($email) {
        $query = "SELECT id, email, first_name, last_name, phone, user_access_level, 
                 profile_image, currency_type, business_name, business_email, 
                 business_phone, business_address, bio, website, 
                 portfolio_url, active_status, created_at, updated_at 
                 FROM " . $this->table_name . " 
                 WHERE email = :email";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return [
                'id' => $row['id'],
                'email' => $row['email'],
                'full_name' => trim($row['first_name'] . ' ' . $row['last_name']),
                'phone' => $row['phone'],
                'role' => $row['user_access_level'],
                'profile_picture' => $row['profile_image'],
                'currency_type' => $row['currency_type'] ?? 'USD',
                'business_name' => $row['business_name'] ?? '',
                'business_email' => $row['business_email'] ?? '',
                'business_phone' => $row['business_phone'] ?? '',
                'business_address' => $row['business_address'] ?? '',
                'bio' => $row['bio'] ?? '',
                'website' => $row['website'] ?? '',
                'portfolio_url' => $row['portfolio_url'] ?? '',
                'is_active' => $row['active_status'] ?? 0,
                'created_at' => $row['created_at'],
                'updated_at' => $row['updated_at']
            ];
        }
        return false;
    }

    /**
     * Verify email with token
     */
    public function verifyEmail($token) {
        $query = "SELECT id, email, first_name, last_name, active_status, token_expires_at 
                 FROM " . $this->table_name . " 
                 WHERE verification_token = :token";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":token", $token);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Check if already verified
            if ($row['active_status'] == 1) {
                return ['status' => 'already_verified', 'message' => 'Email already verified'];
            }

            // Check if token expired
            if (strtotime($row['token_expires_at']) < time()) {
                return ['status' => 'expired', 'message' => 'Verification link has expired'];
            }

            // Activate the account
            $update_query = "UPDATE " . $this->table_name . " 
                           SET active_status = 1, 
                               verification_token = NULL, 
                               token_expires_at = NULL 
                           WHERE id = :id";
            
            $update_stmt = $this->conn->prepare($update_query);
            $update_stmt->bindParam(":id", $row['id']);
            
            if ($update_stmt->execute()) {
                return [
                    'status' => 'success', 
                    'message' => 'Email verified successfully! You can now login.',
                    'user' => [
                        'email' => $row['email'],
                        'name' => trim($row['first_name'] . ' ' . $row['last_name'])
                    ]
                ];
            }
        }
        
        return ['status' => 'invalid', 'message' => 'Invalid verification link'];
    }

    /**
     * Resend verification email
     */
    public function resendVerification($email) {
        $query = "SELECT id, active_status FROM " . $this->table_name . " WHERE email = :email";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($row['active_status'] == 1) {
                return ['status' => 'already_verified', 'message' => 'Email already verified'];
            }

            // Generate new token
            $verification_token = bin2hex(random_bytes(32));
            $token_expires_at = date('Y-m-d H:i:s', strtotime('+24 hours'));

            $update_query = "UPDATE " . $this->table_name . " 
                           SET verification_token = :token, 
                               token_expires_at = :expires_at 
                           WHERE id = :id";
            
            $update_stmt = $this->conn->prepare($update_query);
            $update_stmt->bindParam(":token", $verification_token);
            $update_stmt->bindParam(":expires_at", $token_expires_at);
            $update_stmt->bindParam(":id", $row['id']);
            
            if ($update_stmt->execute()) {
                $this->verification_token = $verification_token;
                return ['status' => 'success', 'message' => 'Verification email sent', 'token' => $verification_token];
            }
        }
        
        return ['status' => 'not_found', 'message' => 'Email not found'];
    }
}
?>