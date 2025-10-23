<?php
/**
 * Authentication Controller
 * Handles login, register, and authentication endpoints
 */

// Include CORS configuration first - this sets all necessary headers
require_once 'config/cors.php';

require_once 'config/database.php';
require_once 'models/User.php';
require_once 'middleware/auth.php';

class AuthController {
    private $database;
    private $db;
    private $user;
    private $auth;

    public function __construct() {
        $this->database = new Database();
        $this->db = $this->database->getConnection();
        $this->user = new User($this->db);
        $this->auth = new JWTAuth();
    }

    /**
     * User login
     */
    public function login() {
        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['email']) || !isset($data['password'])) {
            http_response_code(400);
            echo json_encode(["message" => "Email and password are required"]);
            return;
        }

        $user_data = $this->user->login($data['email'], $data['password']);

        if ($user_data) {
            $token = $this->auth->generateToken($user_data);
            
            http_response_code(200);
            echo json_encode([
                "message" => "Login successful",
                "token" => $token,
                "user" => [
                    "id" => $user_data['id'],
                    "email" => $user_data['email'],
                    "full_name" => $user_data['full_name'],
                    "role" => $user_data['role'],
                    "currency_type" => $user_data['currency_type'] ?? 'USD'
                ]
            ]);
        } else {
            http_response_code(401);
            echo json_encode(["message" => "Invalid credentials"]);
        }
    }

    /**
     * User registration
     */
    public function register() {
        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['email']) || !isset($data['password']) || !isset($data['full_name'])) {
            http_response_code(400);
            echo json_encode(["message" => "Email, password, and full name are required"]);
            return;
        }

        // Check if email already exists
        if ($this->user->emailExists($data['email'])) {
            http_response_code(409);
            echo json_encode(["message" => "Email already exists"]);
            return;
        }

        // Set user properties
        $this->user->email = $data['email'];
        $this->user->password_hash = $data['password'];
        $this->user->full_name = $data['full_name'];
        $this->user->phone = $data['phone'] ?? '';
        $this->user->role = $data['role'] ?? 'photographer';
        $this->user->profile_picture = $data['profile_picture'] ?? '';

        if ($this->user->create()) {
            // Get the actual user data from database after creation
            $created_user = $this->user->getById($this->user->id);
            
            $user_data = [
                'id' => $created_user['id'],
                'email' => $created_user['email'],
                'full_name' => $created_user['full_name'],
                'role' => $created_user['role'],
                'currency_type' => $created_user['currency_type'] ?? 'USD'
            ];

            $token = $this->auth->generateToken($user_data);

            http_response_code(201);
            echo json_encode([
                "message" => "User created successfully",
                "token" => $token,
                "user" => $user_data
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Unable to create user"]);
        }
    }

    /**
     * Get current user profile
     */
    public function profile() {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $user_info = $this->user->getById($user_data['user_id']);

        if ($user_info) {
            http_response_code(200);
            echo json_encode([
                "message" => "User profile",
                "user" => $user_info
            ]);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "User not found"]);
        }
    }

    /**
     * Update user profile
     */
    public function updateProfile() {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

    $this->user->id = $user_data['user_id'];
    $this->user->full_name = $data['full_name'] ?? '';
    $this->user->phone = $data['phone'] ?? '';
    $this->user->profile_picture = $data['profile_picture'] ?? '';
    $this->user->currency_type = $data['currency_type'] ?? 'USD';
    $this->user->business_name = $data['business_name'] ?? '';
    $this->user->business_email = $data['business_email'] ?? '';
    $this->user->business_phone = $data['business_phone'] ?? '';
    $this->user->business_address = $data['business_address'] ?? '';
    $this->user->bio = $data['bio'] ?? '';
    $this->user->website = $data['website'] ?? '';
    $this->user->portfolio_url = $data['portfolio_url'] ?? '';

        if ($this->user->update()) {
            http_response_code(200);
            echo json_encode(["message" => "Profile updated successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Unable to update profile"]);
        }
    }

    /**
     * Upload profile image
     */
    public function uploadProfileImage() {
        $user_data = $this->auth->getUserFromHeader();
        
        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        // Check if file was uploaded
        if (!isset($_FILES['profile_image'])) {
            http_response_code(400);
            echo json_encode(["message" => "No file uploaded"]);
            return;
        }

        $file = $_FILES['profile_image'];
        $allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        $max_file_size = 5242880; // 5MB

        // Check for upload errors
        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(["message" => "Upload error"]);
            return;
        }

        // Validate file type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime_type = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mime_type, $allowed_types)) {
            http_response_code(400);
            echo json_encode(["message" => "Invalid file type. Only images are allowed."]);
            return;
        }

        // Validate file size
        if ($file['size'] > $max_file_size) {
            http_response_code(400);
            echo json_encode(["message" => "File too large. Maximum size is 5MB."]);
            return;
        }

        // Set upload directory
        $upload_dir = dirname(__DIR__) . '/uploads/profiles/';
        if (!file_exists($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }

        // Generate unique filename
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'profile_' . $user_data['user_id'] . '_' . time() . '.' . $extension;
        $filepath = $upload_dir . $filename;

        // Delete old profile images for this user
        $pattern = $upload_dir . 'profile_' . $user_data['user_id'] . '_*';
        foreach (glob($pattern) as $old_file) {
            if (file_exists($old_file)) {
                unlink($old_file);
            }
        }

        // Move uploaded file
        if (move_uploaded_file($file['tmp_name'], $filepath)) {
            $web_path = '/lens-booking/uploads/profiles/' . $filename;
            
            http_response_code(200);
            echo json_encode([
                "message" => "Image uploaded successfully",
                "file_path" => $web_path,
                "filename" => $filename
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to save file"]);
        }
    }
}

// Handle request
$auth_controller = new AuthController();
$request_method = $_SERVER["REQUEST_METHOD"];
$request_uri = $_SERVER['REQUEST_URI'];

// Remove base path and get endpoint
$endpoint = str_replace('/lens-booking/api/auth', '', parse_url($request_uri, PHP_URL_PATH));

// Debug logging
error_log("Auth API - Method: $request_method, URI: $request_uri, Endpoint: $endpoint");

switch ($request_method) {
    case 'POST':
        if ($endpoint === '/login') {
            $auth_controller->login();
        } elseif ($endpoint === '/register') {
            $auth_controller->register();
        } elseif ($endpoint === '/upload-profile-image') {
            $auth_controller->uploadProfileImage();
        } else {
            http_response_code(404);
            echo json_encode([
                "message" => "Endpoint not found", 
                "debug" => [
                    "method" => $request_method,
                    "uri" => $request_uri,
                    "endpoint" => $endpoint
                ]
            ]);
        }
        break;
    
    case 'GET':
        if ($endpoint === '/profile') {
            $auth_controller->profile();
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Endpoint not found"]);
        }
        break;
    
    case 'PUT':
        if ($endpoint === '/profile') {
            $auth_controller->updateProfile();
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Endpoint not found"]);
        }
        break;
    
    default:
        http_response_code(405);
        echo json_encode(["message" => "Method not allowed"]);
        break;
}
?>