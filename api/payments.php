<?php
/**
 * Payments Controller
 * Handles payment schedules management endpoints
 */

// Include CORS configuration first
require_once 'config/cors.php';

require_once 'config/database.php';
require_once 'middleware/auth.php';

class PaymentsController {
    private $database;
    private $db;
    private $auth;
    private $table_name = "payments";

    public function __construct() {
        $this->database = new Database();
        $this->db = $this->database->getConnection();
        $this->auth = new JWTAuth();
    }

    /**
     * Get all payments
     */
    public function getAll() {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        try {
            $query = "SELECT p.*, 
                             i.invoice_number, i.client_id as invoice_client_id,
                             b.title as booking_title, b.client_id as booking_client_id,
                             c1.full_name as booking_client_name,
                             c2.full_name as invoice_client_name
                      FROM " . $this->table_name . " p
                      LEFT JOIN invoices i ON p.invoice_id = i.id
                      LEFT JOIN bookings b ON p.booking_id = b.id
                      LEFT JOIN clients c1 ON b.client_id = c1.id
                      LEFT JOIN clients c2 ON i.client_id = c2.id
                      WHERE p.user_id = :photographer_id
                      ORDER BY p.payment_date ASC, p.created_at DESC";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":photographer_id", $user_data['user_id']);
            $stmt->execute();

            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Format the response to match frontend expectations
            $formatted_payments = array_map(function($payment) {
                return [
                    'id' => $payment['id'],
                    'user_id' => $payment['user_id'],
                    'invoice_id' => $payment['invoice_id'],
                    'booking_id' => $payment['booking_id'],
                    'schedule_id' => $payment['schedule_id'],
                    'amount' => (float)$payment['amount'],
                    'payment_date' => $payment['payment_date'],
                    'payment_method' => $payment['payment_method'],
                    'transaction_reference' => $payment['transaction_reference'],
                    'notes' => $payment['notes'],
                    'status' => $payment['status'] ?? 'pending',
                    'created_at' => $payment['created_at'],
                    'updated_at' => $payment['updated_at'],
                    'bookings' => $payment['booking_id'] ? [
                        'title' => $payment['booking_title'],
                        'client_id' => $payment['booking_client_id'],
                        'clients' => $payment['booking_client_name'] ? [
                            'name' => $payment['booking_client_name']
                        ] : null
                    ] : null,
                    'invoices' => $payment['invoice_id'] ? [
                        'invoice_number' => $payment['invoice_number'],
                        'client_id' => $payment['invoice_client_id'],
                        'clients' => $payment['invoice_client_name'] ? [
                            'name' => $payment['invoice_client_name']
                        ] : null
                    ] : null
                ];
            }, $payments);

            http_response_code(200);
            echo json_encode([
                "message" => "Payments retrieved successfully",
                "data" => $formatted_payments
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to retrieve payments",
                "error" => $e->getMessage()
            ]);
        }
    }

    /**
     * Get single payment
     */
    public function getOne($id) {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        try {
            $query = "SELECT p.*, 
                             i.invoice_number, i.client_id as invoice_client_id,
                             b.title as booking_title, b.client_id as booking_client_id,
                             c1.full_name as booking_client_name,
                             c2.full_name as invoice_client_name
                      FROM " . $this->table_name . " p
                      LEFT JOIN invoices i ON p.invoice_id = i.id
                      LEFT JOIN bookings b ON p.booking_id = b.id
                      LEFT JOIN clients c1 ON b.client_id = c1.id
                      LEFT JOIN clients c2 ON i.client_id = c2.id
                      WHERE p.id = :id AND p.user_id = :photographer_id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":id", $id);
            $stmt->bindParam(":photographer_id", $user_data['user_id']);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                $payment = $stmt->fetch(PDO::FETCH_ASSOC);

                $formatted_payment = [
                    'id' => $payment['id'],
                    'user_id' => $payment['user_id'],
                    'invoice_id' => $payment['invoice_id'],
                    'booking_id' => $payment['booking_id'],
                    'schedule_id' => $payment['schedule_id'],
                    'amount' => (float)$payment['amount'],
                    'payment_date' => $payment['payment_date'],
                    'payment_method' => $payment['payment_method'],
                    'transaction_reference' => $payment['transaction_reference'],
                    'notes' => $payment['notes'],
                    'status' => $payment['status'] ?? 'pending',
                    'created_at' => $payment['created_at'],
                    'updated_at' => $payment['updated_at'],
                    'bookings' => $payment['booking_id'] ? [
                        'title' => $payment['booking_title'],
                        'client_id' => $payment['booking_client_id'],
                        'clients' => $payment['booking_client_name'] ? [
                            'name' => $payment['booking_client_name']
                        ] : null
                    ] : null,
                    'invoices' => $payment['invoice_id'] ? [
                        'invoice_number' => $payment['invoice_number'],
                        'client_id' => $payment['invoice_client_id'],
                        'clients' => $payment['invoice_client_name'] ? [
                            'name' => $payment['invoice_client_name']
                        ] : null
                    ] : null
                ];

                http_response_code(200);
                echo json_encode([
                    "message" => "Payment retrieved successfully",
                    "data" => $formatted_payment
                ]);
            } else {
                http_response_code(404);
                echo json_encode(["message" => "Payment not found"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to retrieve payment",
                "error" => $e->getMessage()
            ]);
        }
    }

    /**
     * Create new payment
     */
    public function create() {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['amount'])) {
            http_response_code(400);
            echo json_encode(["message" => "Amount is required"]);
            return;
        }

        try {
            $query = "INSERT INTO " . $this->table_name . " 
                     SET user_id=:user_id, invoice_id=:invoice_id, booking_id=:booking_id,
                         schedule_id=:schedule_id, amount=:amount, payment_date=:payment_date,
                         payment_method=:payment_method, transaction_reference=:transaction_reference,
                         notes=:notes";

            $stmt = $this->db->prepare($query);

            $stmt->bindParam(":user_id", $user_data['user_id']);
            $stmt->bindParam(":invoice_id", $data['invoice_id'] ?? null);
            $stmt->bindParam(":booking_id", $data['booking_id'] ?? null);
            $stmt->bindParam(":schedule_id", $data['schedule_id'] ?? null);
            $stmt->bindParam(":amount", $data['amount']);
            $stmt->bindParam(":payment_date", $data['payment_date']);
            $stmt->bindParam(":payment_method", $data['payment_method'] ?? 'cash');
            $stmt->bindParam(":transaction_reference", $data['transaction_reference'] ?? null);
            $stmt->bindParam(":notes", $data['notes'] ?? null);

            if ($stmt->execute()) {
                http_response_code(201);
                echo json_encode([
                    "message" => "Payment created successfully",
                    "payment_id" => $this->db->lastInsertId()
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Unable to create payment"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to create payment",
                "error" => $e->getMessage()
            ]);
        }
    }

    /**
     * Update payment
     */
    public function update($id) {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        try {
            $query = "UPDATE " . $this->table_name . " 
                     SET invoice_id=:invoice_id, booking_id=:booking_id,
                         schedule_id=:schedule_id, amount=:amount, payment_date=:payment_date,
                         payment_method=:payment_method, transaction_reference=:transaction_reference,
                         notes=:notes, updated_at=CURRENT_TIMESTAMP
                     WHERE id=:id AND user_id=:user_id";

            $stmt = $this->db->prepare($query);

            $stmt->bindParam(":invoice_id", $data['invoice_id'] ?? null);
            $stmt->bindParam(":booking_id", $data['booking_id'] ?? null);
            $stmt->bindParam(":schedule_id", $data['schedule_id'] ?? null);
            $stmt->bindParam(":amount", $data['amount']);
            $stmt->bindParam(":payment_date", $data['payment_date']);
            $stmt->bindParam(":payment_method", $data['payment_method'] ?? 'cash');
            $stmt->bindParam(":transaction_reference", $data['transaction_reference'] ?? null);
            $stmt->bindParam(":notes", $data['notes'] ?? null);
            $stmt->bindParam(":id", $id);
            $stmt->bindParam(":user_id", $user_data['user_id']);

            if ($stmt->execute()) {
                http_response_code(200);
                echo json_encode(["message" => "Payment updated successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Unable to update payment"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to update payment",
                "error" => $e->getMessage()
            ]);
        }
    }

    /**
     * Delete payment
     */
    public function delete($id) {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        try {
            $query = "DELETE FROM " . $this->table_name . " 
                     WHERE id = :id AND user_id = :user_id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":id", $id);
            $stmt->bindParam(":user_id", $user_data['user_id']);

            if ($stmt->execute()) {
                http_response_code(200);
                echo json_encode(["message" => "Payment deleted successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Unable to delete payment"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to delete payment",
                "error" => $e->getMessage()
            ]);
        }
    }
}

// Handle request
$payments_controller = new PaymentsController();
$request_method = $_SERVER["REQUEST_METHOD"];
$request_uri = $_SERVER['REQUEST_URI'];

// Remove base path and get endpoint
$endpoint = str_replace('/lens-booking/lens-booking/api/payments', '', parse_url($request_uri, PHP_URL_PATH));

// Get ID from URL if present
$id = null;
if (preg_match('/^\/(\d+)$/', $endpoint, $matches)) {
    $id = (int)$matches[1];
    $endpoint = '/{id}';
}

switch ($request_method) {
    case 'GET':
        if ($endpoint === '') {
            $payments_controller->getAll();
        } elseif ($endpoint === '/{id}' && $id) {
            $payments_controller->getOne($id);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Endpoint not found"]);
        }
        break;
    
    case 'POST':
        if ($endpoint === '') {
            $payments_controller->create();
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Endpoint not found"]);
        }
        break;
    
    case 'PUT':
        if ($endpoint === '/{id}' && $id) {
            $payments_controller->update($id);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Endpoint not found"]);
        }
        break;
    
    case 'DELETE':
        if ($endpoint === '/{id}' && $id) {
            $payments_controller->delete($id);
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
