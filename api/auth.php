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
                    "role" => $user_data['role']
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
                'role' => $created_user['role']
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

        if ($this->user->update()) {
            http_response_code(200);
            echo json_encode(["message" => "Profile updated successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Unable to update profile"]);
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