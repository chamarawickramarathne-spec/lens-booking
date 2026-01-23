<?php
/**
 * User Model
 * Handles user-related database operations
 */

class User {
    private $conn;
    private $table_name = "users";

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
        // Generate verification token
        $verification_token = bin2hex(random_bytes(32));
        $token_expires_at = date('Y-m-d H:i:s', strtotime('+24 hours'));

        $query = "INSERT INTO " . $this->table_name . " 
                 SET email=:email, password_hash=:password_hash, full_name=:full_name, 
                     phone=:phone, access_level_id=:access_level_id, 
                     profile_picture=:profile_picture, currency_type=:currency_type,
                     email_verified=:email_verified, verification_token=:verification_token, 
                     token_expires_at=:token_expires_at";

        $stmt = $this->conn->prepare($query);

        // Sanitize inputs
        $this->email = htmlspecialchars(strip_tags($this->email));
        $this->full_name = htmlspecialchars(strip_tags($this->full_name));
        $this->phone = htmlspecialchars(strip_tags($this->phone));
        
        // Hash password
        $password_hash = password_hash($this->password_hash, PASSWORD_DEFAULT);

        // Set defaults
        $profile_picture = $this->profile_picture ?: '';
        $currency_type = $this->currency_type ?: 'USD';
        $access_level_id = 1; // Default to Free tier
        $email_verified = 0; // Default to unverified

        // Bind values
        $stmt->bindParam(":email", $this->email);
        $stmt->bindParam(":password_hash", $password_hash);
        $stmt->bindParam(":full_name", $this->full_name);
        $stmt->bindParam(":phone", $this->phone);
        $stmt->bindParam(":access_level_id", $access_level_id);
        $stmt->bindParam(":profile_picture", $profile_picture);
        $stmt->bindParam(":currency_type", $currency_type);
        $stmt->bindParam(":email_verified", $email_verified);
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
        $query = "SELECT u.id, u.email, u.password_hash, u.full_name, u.phone, 
                 u.profile_picture, u.currency_type, 
                 u.business_name, u.business_email, u.business_phone, u.business_address,
                 u.bio, u.website, u.portfolio_url, u.email_verified, u.access_level_id,
                 u.created_at, u.updated_at,
                 al.level_name as access_level_name, al.role, al.max_clients, al.max_bookings
                 FROM " . $this->table_name . " u
                 LEFT JOIN access_levels al ON u.access_level_id = al.id
                 WHERE u.email = :email";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (password_verify($password, $row['password_hash'])) {
                // Check if account is verified
                if (isset($row['email_verified']) && $row['email_verified'] == 0) {
                    return [
                        'error' => 'unverified',
                        'message' => 'Please check your email to confirm your signup and activate your account.'
                    ];
                }
                
                // Return user data
                return [
                    'id' => $row['id'],
                    'email' => $row['email'],
                    'full_name' => $row['full_name'],
                    'phone' => $row['phone'],
                    'role' => $row['role'] ?? 'photographer',
                    'profile_picture' => $row['profile_picture'],
                    'currency_type' => $row['currency_type'] ?? 'USD',
                    'business_name' => $row['business_name'] ?? '',
                    'business_email' => $row['business_email'] ?? '',
                    'business_phone' => $row['business_phone'] ?? '',
                    'business_address' => $row['business_address'] ?? '',
                    'bio' => $row['bio'] ?? '',
                    'website' => $row['website'] ?? '',
                    'portfolio_url' => $row['portfolio_url'] ?? '',
                    'email_verified' => $row['email_verified'],
                    'access_level' => [
                        'id' => $row['access_level_id'],
                        'name' => $row['access_level_name'],
                        'role' => $row['role'] ?? 'photographer',
                        'max_clients' => $row['max_clients'],
                        'max_bookings' => $row['max_bookings']
                    ],
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
        $query = "SELECT u.id, u.email, u.full_name, u.phone, 
                 u.profile_picture, u.currency_type, u.business_name, u.business_email, 
                 u.business_phone, u.business_address, u.bio, u.website, 
                 u.portfolio_url, u.email_verified, u.access_level_id,
                 u.created_at, u.updated_at,
                 al.level_name as access_level_name, al.role, al.max_clients, al.max_bookings
                 FROM " . $this->table_name . " u
                 LEFT JOIN access_levels al ON u.access_level_id = al.id
                 WHERE u.id = :id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return [
                'id' => $row['id'],
                'email' => $row['email'],
                'full_name' => $row['full_name'],
                'phone' => $row['phone'],
                'role' => $row['role'] ?? 'photographer',
                'profile_picture' => $row['profile_picture'],
                'currency_type' => $row['currency_type'] ?? 'USD',
                'business_name' => $row['business_name'] ?? '',
                'business_email' => $row['business_email'] ?? '',
                'business_phone' => $row['business_phone'] ?? '',
                'business_address' => $row['business_address'] ?? '',
                'bio' => $row['bio'] ?? '',
                'website' => $row['website'] ?? '',
                'portfolio_url' => $row['portfolio_url'] ?? '',
                'email_verified' => $row['email_verified'],
                'access_level' => [
                    'id' => $row['access_level_id'],
                    'name' => $row['access_level_name'],
                    'role' => $row['role'] ?? 'photographer',
                    'max_clients' => $row['max_clients'],
                    'max_bookings' => $row['max_bookings']
                ],
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
        $query = "UPDATE " . $this->table_name . " 
             SET full_name=:full_name, phone=:phone, 
                 profile_picture=:profile_picture, currency_type=:currency_type,
                 business_name=:business_name, business_email=:business_email,
                 business_phone=:business_phone, business_address=:business_address,
                 bio=:bio, website=:website, 
                 portfolio_url=:portfolio_url
             WHERE id=:id";

        $stmt = $this->conn->prepare($query);

        // Sanitize inputs
        $this->full_name = htmlspecialchars(strip_tags($this->full_name ?? ''));
        $this->phone = htmlspecialchars(strip_tags($this->phone ?? ''));
        $this->business_name = htmlspecialchars(strip_tags($this->business_name ?? ''));
        $this->business_email = htmlspecialchars(strip_tags($this->business_email ?? ''));
        $this->business_phone = htmlspecialchars(strip_tags($this->business_phone ?? ''));
        $this->business_address = htmlspecialchars(strip_tags($this->business_address ?? ''));
        $this->bio = htmlspecialchars(strip_tags($this->bio ?? ''));
        $this->website = htmlspecialchars(strip_tags($this->website ?? ''));
        $this->portfolio_url = htmlspecialchars(strip_tags($this->portfolio_url ?? ''));

        // Bind values
        $stmt->bindParam(":full_name", $this->full_name);
        $stmt->bindParam(":phone", $this->phone);
        $stmt->bindParam(":profile_picture", $this->profile_picture);
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
        $query = "SELECT u.id, u.email, u.full_name, u.phone, 
                 u.profile_picture, u.currency_type, u.business_name, u.business_email, 
                 u.business_phone, u.business_address, u.bio, u.website, 
                 u.portfolio_url, u.email_verified, u.access_level_id,
                 u.created_at, u.updated_at,
                 al.level_name as access_level_name, al.role, al.max_clients, al.max_bookings
                 FROM " . $this->table_name . " u
                 LEFT JOIN access_levels al ON u.access_level_id = al.id
                 WHERE u.email = :email";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return [
                'id' => $row['id'],
                'email' => $row['email'],
                'full_name' => $row['full_name'],
                'phone' => $row['phone'],
                'role' => $row['role'] ?? 'photographer',
                'profile_picture' => $row['profile_picture'],
                'currency_type' => $row['currency_type'] ?? 'USD',
                'business_name' => $row['business_name'] ?? '',
                'business_email' => $row['business_email'] ?? '',
                'business_phone' => $row['business_phone'] ?? '',
                'business_address' => $row['business_address'] ?? '',
                'bio' => $row['bio'] ?? '',
                'website' => $row['website'] ?? '',
                'portfolio_url' => $row['portfolio_url'] ?? '',
                'email_verified' => $row['email_verified'],
                'access_level' => [
                    'id' => $row['access_level_id'],
                    'name' => $row['access_level_name'],
                    'role' => $row['role'] ?? 'photographer',
                    'max_clients' => $row['max_clients'],
                    'max_bookings' => $row['max_bookings']
                ],
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
        $query = "SELECT id, email, full_name, email_verified, token_expires_at 
                 FROM " . $this->table_name . " 
                 WHERE verification_token = :token";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":token", $token);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Check if already verified
            if ($row['email_verified'] == 1) {
                return ['status' => 'already_verified', 'message' => 'Email already verified'];
            }

            // Check if token expired
            if (strtotime($row['token_expires_at']) < time()) {
                return ['status' => 'expired', 'message' => 'Verification link has expired'];
            }

            // Activate the account
            $update_query = "UPDATE " . $this->table_name . " 
                           SET email_verified = 1, 
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
                        'name' => $row['full_name']
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
        $query = "SELECT id, email_verified FROM " . $this->table_name . " WHERE email = :email";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($row['email_verified'] == 1) {
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