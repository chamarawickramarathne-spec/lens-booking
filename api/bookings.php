<?php
/**
 * Bookings Controller
 * Handles booking management endpoints
 */

// Include CORS configuration first
require_once 'config/cors.php';

require_once 'config/database.php';
require_once 'config/cors.php';
require_once 'models/Booking.php';
require_once 'middleware/auth.php';

class BookingsController {
    private $database;
    private $db;
    private $booking;
    private $auth;

    public function __construct() {
        $this->database = new Database();
        $this->db = $this->database->getConnection();
        $this->booking = new Booking($this->db);
        $this->auth = new JWTAuth();
    }

    /**
     * Get all bookings
     */
    public function getAll() {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $bookings = $this->booking->getByUserId($user_data['user_id']);

        http_response_code(200);
        echo json_encode([
            "message" => "Bookings retrieved successfully",
            "data" => $bookings
        ]);
    }

    /**
     * Get single booking
     */
    public function getOne($id) {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $booking = $this->booking->getById($id, $user_data['user_id']);

        if ($booking) {
            http_response_code(200);
            echo json_encode([
                "message" => "Booking retrieved successfully",
                "data" => $booking
            ]);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Booking not found"]);
        }
    }

    /**
     * Create new booking
     */
    public function create() {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['booking_date']) || !isset($data['client_id'])) {
            http_response_code(400);
            echo json_encode(["message" => "Booking date and client are required"]);
            return;
        }

        // Set booking properties
        $this->booking->user_id = $user_data['user_id'];
        $this->booking->client_id = $data['client_id'];
        $this->booking->package_id = $data['package_id'] ?? null;
        $this->booking->booking_date = $data['booking_date'];
        $this->booking->booking_time = $data['booking_time'] ?? null;
        $this->booking->end_time = $data['end_time'] ?? null;
        $this->booking->location = $data['location'] ?? '';
        $this->booking->status = $data['status'] ?? 'pending';
        $this->booking->total_amount = $data['total_amount'] ?? 0;
        $this->booking->paid_amount = $data['paid_amount'] ?? 0;
        $this->booking->currency = $data['currency'] ?? 'LKR';
        $this->booking->deposit_amount = $data['deposit_amount'] ?? 0;
        $this->booking->deposit_paid = $data['deposit_paid'] ?? false;
        $this->booking->special_requirements = $data['special_requirements'] ?? '';
        $this->booking->notes = $data['notes'] ?? '';

        if ($this->booking->create()) {
            http_response_code(201);
            echo json_encode([
                "message" => "Booking created successfully",
                "booking_id" => $this->booking->id
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Unable to create booking"]);
        }
    }

    /**
     * Update booking status
     */
    public function updateStatus($id) {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['status'])) {
            http_response_code(400);
            echo json_encode(["message" => "Status is required"]);
            return;
        }

        if ($this->booking->updateStatus($id, $user_data['user_id'], $data['status'])) {
            http_response_code(200);
            echo json_encode(["message" => "Booking status updated successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Unable to update booking status"]);
        }
    }
}

// Handle request
$bookings_controller = new BookingsController();
$request_method = $_SERVER["REQUEST_METHOD"];
$request_uri = $_SERVER['REQUEST_URI'];

// Remove base path and get endpoint
$endpoint = str_replace('/lens-booking/api/bookings', '', parse_url($request_uri, PHP_URL_PATH));

// Get ID from URL if present
$id = null;
if (preg_match('/^\/(\d+)$/', $endpoint, $matches)) {
    $id = (int)$matches[1];
    $endpoint = '/{id}';
} elseif (preg_match('/^\/(\d+)\/status$/', $endpoint, $matches)) {
    $id = (int)$matches[1];
    $endpoint = '/{id}/status';
}

switch ($request_method) {
    case 'GET':
        if ($endpoint === '') {
            $bookings_controller->getAll();
        } elseif ($endpoint === '/{id}' && $id) {
            $bookings_controller->getOne($id);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Endpoint not found"]);
        }
        break;
    
    case 'POST':
        if ($endpoint === '') {
            $bookings_controller->create();
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Endpoint not found"]);
        }
        break;
    
    case 'PUT':
        if ($endpoint === '/{id}/status' && $id) {
            $bookings_controller->updateStatus($id);
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