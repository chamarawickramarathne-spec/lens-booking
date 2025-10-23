<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../models/AccessLevel.php';

class AccessLevelsController {
    private $db;
    private $access_level;
    private $auth;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->access_level = new AccessLevel($this->db);
        $this->auth = new Auth($this->db);
    }

    /**
     * Get all access levels
     */
    public function getAll() {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        try {
            $access_levels = $this->access_level->getAll();
            http_response_code(200);
            echo json_encode($access_levels);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to fetch access levels",
                "error" => $e->getMessage()
            ]);
        }
    }

    /**
     * Get current user's access level info
     */
    public function getUserAccessInfo() {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        try {
            $access_info = $this->access_level->getUserAccessInfo($user_data['user_id']);
            
            if (!$access_info) {
                http_response_code(404);
                echo json_encode(["message" => "User access information not found"]);
                return;
            }

            http_response_code(200);
            echo json_encode($access_info);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to fetch user access info",
                "error" => $e->getMessage()
            ]);
        }
    }

    /**
     * Check if user can create a client
     */
    public function checkClientPermission() {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        try {
            $can_create = $this->access_level->canCreateClient($user_data['user_id']);
            http_response_code(200);
            echo json_encode(["can_create" => $can_create]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to check permission",
                "error" => $e->getMessage()
            ]);
        }
    }

    /**
     * Check if user can create a booking
     */
    public function checkBookingPermission() {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        try {
            $can_create = $this->access_level->canCreateBooking($user_data['user_id']);
            http_response_code(200);
            echo json_encode(["can_create" => $can_create]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to check permission",
                "error" => $e->getMessage()
            ]);
        }
    }
}

// Handle request
$access_levels_controller = new AccessLevelsController();
$request_method = $_SERVER["REQUEST_METHOD"];
$request_uri = $_SERVER['REQUEST_URI'];

// Remove base path and get endpoint
$endpoint = str_replace('/lens-booking/api/access-levels', '', parse_url($request_uri, PHP_URL_PATH));

switch ($request_method) {
    case 'GET':
        if ($endpoint === '') {
            $access_levels_controller->getAll();
        } elseif ($endpoint === '/user-info') {
            $access_levels_controller->getUserAccessInfo();
        } elseif ($endpoint === '/check-client') {
            $access_levels_controller->checkClientPermission();
        } elseif ($endpoint === '/check-booking') {
            $access_levels_controller->checkBookingPermission();
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
