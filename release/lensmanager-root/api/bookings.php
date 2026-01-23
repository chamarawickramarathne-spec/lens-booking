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
require_once 'models/AccessLevel.php';
require_once 'middleware/auth.php';

class BookingsController {
    private $database;
    private $db;
    private $booking;
    private $access_level;
    private $auth;

    public function __construct() {
        $this->database = new Database();
        $this->db = $this->database->getConnection();
        $this->booking = new Booking($this->db);
        $this->access_level = new AccessLevel($this->db);
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

        // Check if user can create more bookings
        if (!$this->access_level->canCreateBooking($user_data['user_id'])) {
            $access_info = $this->access_level->getUserAccessInfo($user_data['user_id']);
            $max_bookings = $access_info['access_level']['max_bookings'];
            $plan_name = $access_info['access_level']['name'];
            
            http_response_code(403);
            echo json_encode([
                "message" => "You've reached your limit of " . $max_bookings . " booking" . ($max_bookings > 1 ? "s" : "") . ".",
                "details" => "Upgrade from " . $plan_name . " to add more bookings."
            ]);
            return;
        }

    $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['client_id'])) {
            http_response_code(400);
            echo json_encode(["message" => "Client is required"]);
            return;
        }

        // If wedding, allow booking_date to be derived from wedding_date
        if (!isset($data['booking_date']) || empty($data['booking_date'])) {
            if (isset($data['package_type']) && strtolower($data['package_type']) === 'wedding' && !empty($data['wedding_date'])) {
                $data['booking_date'] = $data['wedding_date'];
            } else {
                http_response_code(400);
                echo json_encode(["message" => "Booking date is required"]);
                return;
            }
        }

        // Set booking properties
        $this->booking->photographer_id = $user_data['user_id'];
        $this->booking->client_id = $data['client_id'];
        $this->booking->booking_date = $data['booking_date'];
        $this->booking->start_time = $data['start_time'] ?? ($data['booking_time'] ?? null);
        $this->booking->end_time = $data['end_time'] ?? null;
        $this->booking->location = $data['location'] ?? '';
        $this->booking->title = $data['title'] ?? '';
        $this->booking->description = $data['description'] ?? ($data['notes'] ?? '');
        $this->booking->package_type = $data['package_type'] ?? '';
        $this->booking->package_name = $data['package_name'] ?? '';
        $this->booking->pre_shoot = isset($data['pre_shoot']) ? (int)!!$data['pre_shoot'] : 0;
        $this->booking->album = isset($data['album']) ? (int)!!$data['album'] : 0;
        $this->booking->total_amount = isset($data['total_amount']) && $data['total_amount'] !== ''
            ? floatval($data['total_amount']) : 0;
        $this->booking->deposit_amount = isset($data['deposit_amount']) && $data['deposit_amount'] !== ''
            ? floatval($data['deposit_amount']) : 0;
        $this->booking->status = $data['status'] ?? 'pending';

        // Wedding-specific fields
        $this->booking->wedding_hotel_name = $data['wedding_hotel_name'] ?? null;
        $this->booking->wedding_date = $data['wedding_date'] ?? null;
        $this->booking->homecoming_hotel_name = $data['homecoming_hotel_name'] ?? null;
        $this->booking->homecoming_date = $data['homecoming_date'] ?? null;
        $this->booking->wedding_album = isset($data['wedding_album']) ? (int)!!$data['wedding_album'] : 0;
        $this->booking->pre_shoot_album = isset($data['pre_shoot_album']) ? (int)!!$data['pre_shoot_album'] : 0;
        $this->booking->family_album = isset($data['family_album']) ? (int)!!$data['family_album'] : 0;
        $this->booking->group_photo_size = $data['group_photo_size'] ?? null;
        $this->booking->homecoming_photo_size = $data['homecoming_photo_size'] ?? null;
        $this->booking->wedding_photo_sizes = $data['wedding_photo_sizes'] ?? null; // expect comma-separated string
        $this->booking->extra_thank_you_cards_qty = isset($data['extra_thank_you_cards_qty']) && $data['extra_thank_you_cards_qty'] !== ''
            ? intval($data['extra_thank_you_cards_qty']) : 0;

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

        $new_status = $data['status'];

        if ($this->booking->updateStatus($id, $user_data['user_id'], $new_status)) {
            // If status is being changed to "confirmed", automatically create an invoice
            if ($new_status === 'confirmed') {
                try {
                    // Get the booking details
                    $booking = $this->booking->getById($id, $user_data['user_id']);
                    
                    if ($booking && $booking['client_id']) {
                        // Check if an invoice already exists for this booking
                        $check_query = "SELECT id FROM invoices WHERE booking_id = :booking_id LIMIT 1";
                        $check_stmt = $this->db->prepare($check_query);
                        $check_stmt->bindParam(":booking_id", $id);
                        $check_stmt->execute();
                        
                        // Only create invoice if one doesn't exist
                        if ($check_stmt->rowCount() == 0) {
                            // Generate invoice number
                            $invoice_number = 'INV-' . date('Ymd') . '-' . str_pad($id, 4, '0', STR_PAD_LEFT);
                            
                            // Create invoice
                            $invoice_query = "INSERT INTO invoices 
                                            SET user_id=:photographer_id, 
                                                client_id=:client_id, 
                                                booking_id=:booking_id,
                                                invoice_number=:invoice_number, 
                                                issue_date=:issue_date, 
                                                subtotal=:subtotal, 
                                                total_amount=:total_amount,
                                                status='draft'";
                            
                            $invoice_stmt = $this->db->prepare($invoice_query);
                            
                            $issue_date = date('Y-m-d');
                            $total_amount = $booking['total_amount'] ?? 0;
                            $tax_amount = 0;
                            
                            $invoice_stmt->bindParam(":photographer_id", $user_data['user_id']);
                            $invoice_stmt->bindParam(":client_id", $booking['client_id']);
                            $invoice_stmt->bindParam(":booking_id", $id);
                            $invoice_stmt->bindParam(":invoice_number", $invoice_number);
                            $invoice_stmt->bindParam(":issue_date", $issue_date);
                            $invoice_stmt->bindParam(":subtotal", $total_amount);
                            $invoice_stmt->bindParam(":tax_amount", $tax_amount);
                            $invoice_stmt->bindParam(":total_amount", $total_amount);
                            
                            $invoice_stmt->execute();
                        }
                    }
                } catch (Exception $e) {
                    // Log error but don't fail the status update
                    error_log("Failed to create invoice for booking $id: " . $e->getMessage());
                }
            }
            
            // Handle cascade cancellation for related invoices and payments
            if ($new_status === 'cancelled' || $new_status === 'cancel_by_client') {
                try {
                    // Find all invoices related to this booking (except already paid ones)
                    $invoice_query = "SELECT id FROM invoices WHERE booking_id = :booking_id AND status != 'paid'";
                    $invoice_stmt = $this->db->prepare($invoice_query);
                    $invoice_stmt->bindParam(':booking_id', $id);
                    $invoice_stmt->execute();
                    $invoices = $invoice_stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    if (!empty($invoices)) {
                        $invoice_ids = array_column($invoices, 'id');
                        
                        // Cancel all non-paid invoices
                        $placeholders = implode(',', array_fill(0, count($invoice_ids), '?'));
                        $update_invoice_query = "UPDATE invoices SET status = 'cancelled' WHERE id IN ($placeholders)";
                        $update_invoice_stmt = $this->db->prepare($update_invoice_query);
                        $update_invoice_stmt->execute($invoice_ids);
                        
                        // Cancel payment schedules related to these invoices (except completed ones)
                        $payment_query = "SELECT id FROM payments WHERE invoice_id IN ($placeholders) AND status != 'completed'";
                        $payment_stmt = $this->db->prepare($payment_query);
                        $payment_stmt->execute($invoice_ids);
                        $payments = $payment_stmt->fetchAll(PDO::FETCH_ASSOC);
                        
                        if (!empty($payments)) {
                            $payment_ids = array_column($payments, 'id');
                            $payment_placeholders = implode(',', array_fill(0, count($payment_ids), '?'));
                            $update_payment_query = "UPDATE payments SET status = 'cancelled' WHERE id IN ($payment_placeholders)";
                            $update_payment_stmt = $this->db->prepare($update_payment_query);
                            $update_payment_stmt->execute($payment_ids);
                        }
                    }
                } catch (Exception $e) {
                    // Log error but don't fail the status update
                    error_log("Failed to cancel related invoices/payments for booking $id: " . $e->getMessage());
                }
            }
            
            http_response_code(200);
            echo json_encode(["message" => "Booking status updated successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Unable to update booking status"]);
        }
    }

    /**
     * Update booking
     */
    public function update($id) {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        // Set booking properties
        $this->booking->id = $id;
        $this->booking->photographer_id = $user_data['user_id'];
        $this->booking->client_id = $data['client_id'] ?? null;
        $this->booking->booking_date = $data['booking_date'] ?? null;
        $this->booking->start_time = $data['start_time'] ?? ($data['booking_time'] ?? null);
        $this->booking->end_time = $data['end_time'] ?? null;
        $this->booking->location = $data['location'] ?? '';
        $this->booking->title = $data['title'] ?? '';
        $this->booking->description = $data['description'] ?? ($data['notes'] ?? '');
        $this->booking->package_type = $data['package_type'] ?? '';
        $this->booking->package_name = $data['package_name'] ?? '';
        $this->booking->pre_shoot = isset($data['pre_shoot']) ? (int)!!$data['pre_shoot'] : 0;
        $this->booking->album = isset($data['album']) ? (int)!!$data['album'] : 0;
        $this->booking->total_amount = isset($data['total_amount']) && $data['total_amount'] !== ''
            ? floatval($data['total_amount']) : 0;
        $this->booking->deposit_amount = isset($data['deposit_amount']) && $data['deposit_amount'] !== ''
            ? floatval($data['deposit_amount']) : 0;
        $this->booking->status = $data['status'] ?? 'pending';

        // Wedding-specific fields
        $this->booking->wedding_hotel_name = $data['wedding_hotel_name'] ?? null;
        $this->booking->wedding_date = $data['wedding_date'] ?? null;
        $this->booking->homecoming_hotel_name = $data['homecoming_hotel_name'] ?? null;
        $this->booking->homecoming_date = $data['homecoming_date'] ?? null;
        $this->booking->wedding_album = isset($data['wedding_album']) ? (int)!!$data['wedding_album'] : 0;
        $this->booking->pre_shoot_album = isset($data['pre_shoot_album']) ? (int)!!$data['pre_shoot_album'] : 0;
        $this->booking->family_album = isset($data['family_album']) ? (int)!!$data['family_album'] : 0;
        $this->booking->group_photo_size = $data['group_photo_size'] ?? null;
        $this->booking->homecoming_photo_size = $data['homecoming_photo_size'] ?? null;
        $this->booking->wedding_photo_sizes = $data['wedding_photo_sizes'] ?? null;
        $this->booking->extra_thank_you_cards_qty = isset($data['extra_thank_you_cards_qty']) && $data['extra_thank_you_cards_qty'] !== ''
            ? intval($data['extra_thank_you_cards_qty']) : 0;

        if ($this->booking->update()) {
            http_response_code(200);
            echo json_encode(["message" => "Booking updated successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Unable to update booking"]);
        }
    }

    /**
     * Delete booking
     */
    public function delete($id) {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        if ($this->booking->delete($id, $user_data['user_id'])) {
            http_response_code(200);
            echo json_encode(["message" => "Booking deleted successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Unable to delete booking"]);
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
        } elseif ($endpoint === '/{id}' && $id) {
            $bookings_controller->update($id);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Endpoint not found"]);
        }
        break;

    case 'DELETE':
        if ($endpoint === '/{id}' && $id) {
            $bookings_controller->delete($id);
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