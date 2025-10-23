<?php
/**
 * Invoices Controller
 * Handles invoice management endpoints
 */

// Include CORS configuration first
require_once 'config/cors.php';

require_once 'config/database.php';
require_once 'middleware/auth.php';

class InvoicesController {
    private $database;
    private $db;
    private $auth;
    private $table_name = "invoices";

    public function __construct() {
        $this->database = new Database();
        $this->db = $this->database->getConnection();
        $this->auth = new JWTAuth();
    }

    /**
     * Get all invoices
     */
    public function getAll() {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        try {
            $query = "SELECT i.*, 
                             c.name as client_name, c.email as client_email, 
                             c.phone as client_phone, c.address as client_address,
                             b.title as booking_title, b.booking_date
                      FROM " . $this->table_name . " i
                      LEFT JOIN clients c ON i.client_id = c.id
                      LEFT JOIN bookings b ON i.booking_id = b.id
                      WHERE i.photographer_id = :photographer_id
                      ORDER BY i.created_at DESC";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":photographer_id", $user_data['user_id']);
            $stmt->execute();

            $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Format the response to match frontend expectations
            $formatted_invoices = array_map(function($invoice) {
                return [
                    'id' => $invoice['id'],
                    'booking_id' => $invoice['booking_id'],
                    'amount' => $invoice['amount'],
                    'due_date' => $invoice['due_date'],
                    'status' => $invoice['status'],
                    'created_at' => $invoice['created_at'],
                    'updated_at' => $invoice['updated_at'],
                    'photographer_id' => $invoice['photographer_id'],
                    'client_id' => $invoice['client_id'],
                    'invoice_number' => $invoice['invoice_number'],
                    'issue_date' => $invoice['issue_date'],
                    'subtotal' => $invoice['subtotal'],
                    'tax_amount' => $invoice['tax_amount'],
                    'total_amount' => $invoice['total_amount'],
                    'notes' => $invoice['notes'],
                    'payment_date' => $invoice['payment_date'],
                    'deposit_amount' => $invoice['deposit_amount'],
                    'clients' => [
                        'name' => $invoice['client_name'],
                        'email' => $invoice['client_email'],
                        'phone' => $invoice['client_phone'],
                        'address' => $invoice['client_address']
                    ],
                    'bookings' => [
                        'title' => $invoice['booking_title'],
                        'booking_date' => $invoice['booking_date']
                    ]
                ];
            }, $invoices);

            http_response_code(200);
            echo json_encode([
                "message" => "Invoices retrieved successfully",
                "data" => $formatted_invoices
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to retrieve invoices",
                "error" => $e->getMessage()
            ]);
        }
    }

    /**
     * Get single invoice
     */
    public function getOne($id) {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        try {
            $query = "SELECT i.*, 
                             c.name as client_name, c.email as client_email, 
                             c.phone as client_phone, c.address as client_address,
                             b.title as booking_title, b.booking_date
                      FROM " . $this->table_name . " i
                      LEFT JOIN clients c ON i.client_id = c.id
                      LEFT JOIN bookings b ON i.booking_id = b.id
                      WHERE i.id = :id AND i.photographer_id = :photographer_id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":id", $id);
            $stmt->bindParam(":photographer_id", $user_data['user_id']);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
                
                $formatted_invoice = [
                    'id' => $invoice['id'],
                    'booking_id' => $invoice['booking_id'],
                    'amount' => $invoice['amount'],
                    'due_date' => $invoice['due_date'],
                    'status' => $invoice['status'],
                    'created_at' => $invoice['created_at'],
                    'updated_at' => $invoice['updated_at'],
                    'photographer_id' => $invoice['photographer_id'],
                    'client_id' => $invoice['client_id'],
                    'invoice_number' => $invoice['invoice_number'],
                    'issue_date' => $invoice['issue_date'],
                    'subtotal' => $invoice['subtotal'],
                    'tax_amount' => $invoice['tax_amount'],
                    'total_amount' => $invoice['total_amount'],
                    'notes' => $invoice['notes'],
                    'payment_date' => $invoice['payment_date'],
                    'deposit_amount' => $invoice['deposit_amount'],
                    'clients' => [
                        'name' => $invoice['client_name'],
                        'email' => $invoice['client_email'],
                        'phone' => $invoice['client_phone'],
                        'address' => $invoice['client_address']
                    ],
                    'bookings' => [
                        'title' => $invoice['booking_title'],
                        'booking_date' => $invoice['booking_date']
                    ]
                ];

                http_response_code(200);
                echo json_encode([
                    "message" => "Invoice retrieved successfully",
                    "data" => $formatted_invoice
                ]);
            } else {
                http_response_code(404);
                echo json_encode(["message" => "Invoice not found"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to retrieve invoice",
                "error" => $e->getMessage()
            ]);
        }
    }

    /**
     * Create new invoice
     */
    public function create() {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['client_id']) || !isset($data['total_amount'])) {
            http_response_code(400);
            echo json_encode(["message" => "Client and total amount are required"]);
            return;
        }

        try {
            $query = "INSERT INTO " . $this->table_name . " 
                     SET photographer_id=:photographer_id, client_id=:client_id, booking_id=:booking_id,
                         invoice_number=:invoice_number, issue_date=:issue_date, due_date=:due_date,
                         subtotal=:subtotal, tax_amount=:tax_amount, total_amount=:total_amount,
                         deposit_amount=:deposit_amount, status=:status, notes=:notes";

            $stmt = $this->db->prepare($query);

            $invoice_number = $data['invoice_number'] ?? 'INV-' . date('Ymd') . '-' . rand(1000, 9999);
            $issue_date = $data['issue_date'] ?? date('Y-m-d');
            $status = $data['status'] ?? 'draft';

            $stmt->bindParam(":photographer_id", $user_data['user_id']);
            $stmt->bindParam(":client_id", $data['client_id']);
            $stmt->bindParam(":booking_id", $data['booking_id']);
            $stmt->bindParam(":invoice_number", $invoice_number);
            $stmt->bindParam(":issue_date", $issue_date);
            $stmt->bindParam(":due_date", $data['due_date']);
            $stmt->bindParam(":subtotal", $data['subtotal']);
            $stmt->bindParam(":tax_amount", $data['tax_amount']);
            $stmt->bindParam(":total_amount", $data['total_amount']);
            $stmt->bindParam(":deposit_amount", $data['deposit_amount']);
            $stmt->bindParam(":status", $status);
            $stmt->bindParam(":notes", $data['notes']);

            if ($stmt->execute()) {
                http_response_code(201);
                echo json_encode([
                    "message" => "Invoice created successfully",
                    "invoice_id" => $this->db->lastInsertId()
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Unable to create invoice"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to create invoice",
                "error" => $e->getMessage()
            ]);
        }
    }

    /**
     * Update invoice
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
            // Check if status is changing to pending
            $check_query = "SELECT status, total_amount, deposit_amount, booking_id FROM " . $this->table_name . " 
                           WHERE id = :id AND photographer_id = :photographer_id";
            $check_stmt = $this->db->prepare($check_query);
            $check_stmt->bindParam(":id", $id);
            $check_stmt->bindParam(":photographer_id", $user_data['user_id']);
            $check_stmt->execute();
            $old_invoice = $check_stmt->fetch(PDO::FETCH_ASSOC);
            
            $is_status_changing_to_pending = ($old_invoice && $old_invoice['status'] !== 'pending' && $data['status'] === 'pending');
            $is_status_changing_to_cancelled = ($old_invoice && 
                ($data['status'] === 'cancelled' || $data['status'] === 'cancel_by_client'));

            $query = "UPDATE " . $this->table_name . " 
                     SET client_id=:client_id, booking_id=:booking_id, due_date=:due_date,
                         subtotal=:subtotal, tax_amount=:tax_amount, total_amount=:total_amount,
                         deposit_amount=:deposit_amount, status=:status, notes=:notes,
                         payment_date=:payment_date, updated_at=CURRENT_TIMESTAMP
                     WHERE id=:id AND photographer_id=:photographer_id";

            $stmt = $this->db->prepare($query);

            $stmt->bindParam(":client_id", $data['client_id']);
            $stmt->bindParam(":booking_id", $data['booking_id']);
            $stmt->bindParam(":due_date", $data['due_date']);
            $stmt->bindParam(":subtotal", $data['subtotal']);
            $stmt->bindParam(":tax_amount", $data['tax_amount']);
            $stmt->bindParam(":total_amount", $data['total_amount']);
            $stmt->bindParam(":deposit_amount", $data['deposit_amount']);
            $stmt->bindParam(":status", $data['status']);
            $stmt->bindParam(":notes", $data['notes']);
            $stmt->bindParam(":payment_date", $data['payment_date']);
            $stmt->bindParam(":id", $id);
            $stmt->bindParam(":photographer_id", $user_data['user_id']);

            if ($stmt->execute()) {
                // Create payment schedules if status changed to pending
                if ($is_status_changing_to_pending) {
                    $this->createPaymentSchedules($id, $old_invoice, $user_data['user_id']);
                }
                
                // Cancel payment schedules if status changed to cancelled
                if ($is_status_changing_to_cancelled) {
                    $this->cancelPaymentSchedules($id);
                }
                
                http_response_code(200);
                echo json_encode(["message" => "Invoice updated successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Unable to update invoice"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to update invoice",
                "error" => $e->getMessage()
            ]);
        }
    }

    /**
     * Create payment schedules when invoice status changes to pending
     */
    private function createPaymentSchedules($invoice_id, $invoice_data, $photographer_id) {
        try {
            // Calculate remaining amount after deposit
            $total_amount = floatval($invoice_data['total_amount']);
            $deposit_amount = floatval($invoice_data['deposit_amount'] ?? 0);
            $remaining_amount = $total_amount - $deposit_amount;
            
            // Delete existing payment schedules for this invoice if any
            $delete_query = "DELETE FROM payments WHERE invoice_id = :invoice_id";
            $delete_stmt = $this->db->prepare($delete_query);
            $delete_stmt->bindParam(":invoice_id", $invoice_id);
            $delete_stmt->execute();
            
            // Create deposit payment if there's a deposit amount
            if ($deposit_amount > 0) {
                $deposit_query = "INSERT INTO payments 
                                (invoice_id, booking_id, photographer_id, payment_name, schedule_type, 
                                 due_date, amount, paid_amount, status, created_at, updated_at)
                                VALUES 
                                (:invoice_id, :booking_id, :photographer_id, 'Deposit Payment', 'deposit',
                                 CURDATE(), :amount, 0, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
                
                $deposit_stmt = $this->db->prepare($deposit_query);
                $deposit_stmt->bindParam(":invoice_id", $invoice_id);
                $deposit_stmt->bindParam(":booking_id", $invoice_data['booking_id']);
                $deposit_stmt->bindParam(":photographer_id", $photographer_id);
                $deposit_stmt->bindParam(":amount", $deposit_amount);
                $deposit_stmt->execute();
            }
            
            // Create final payment schedule for remaining amount
            if ($remaining_amount > 0) {
                $final_due_date = date('Y-m-d', strtotime('+30 days'));
                
                $final_query = "INSERT INTO payments 
                               (invoice_id, booking_id, photographer_id, payment_name, schedule_type,
                                due_date, amount, paid_amount, status, created_at, updated_at)
                               VALUES 
                               (:invoice_id, :booking_id, :photographer_id, 'Final Payment', 'final',
                                :due_date, :amount, 0, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
                
                $final_stmt = $this->db->prepare($final_query);
                $final_stmt->bindParam(":invoice_id", $invoice_id);
                $final_stmt->bindParam(":booking_id", $invoice_data['booking_id']);
                $final_stmt->bindParam(":photographer_id", $photographer_id);
                $final_stmt->bindParam(":due_date", $final_due_date);
                $final_stmt->bindParam(":amount", $remaining_amount);
                $final_stmt->execute();
            }
            
            return true;
        } catch (Exception $e) {
            error_log("Failed to create payment schedules: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Cancel payment schedules when invoice is cancelled
     */
    private function cancelPaymentSchedules($invoice_id) {
        try {
            // Update all payment schedules for this invoice to cancelled (except completed ones)
            $update_query = "UPDATE payments 
                           SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
                           WHERE invoice_id = :invoice_id AND status != 'completed'";
            
            $update_stmt = $this->db->prepare($update_query);
            $update_stmt->bindParam(":invoice_id", $invoice_id);
            $update_stmt->execute();
            
            return true;
        } catch (Exception $e) {
            error_log("Failed to cancel payment schedules: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Delete invoice
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
                     WHERE id = :id AND photographer_id = :photographer_id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":id", $id);
            $stmt->bindParam(":photographer_id", $user_data['user_id']);

            if ($stmt->execute()) {
                http_response_code(200);
                echo json_encode(["message" => "Invoice deleted successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Unable to delete invoice"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to delete invoice",
                "error" => $e->getMessage()
            ]);
        }
    }
}

// Handle request
$invoices_controller = new InvoicesController();
$request_method = $_SERVER["REQUEST_METHOD"];
$request_uri = $_SERVER['REQUEST_URI'];

// Remove base path and get endpoint
$endpoint = str_replace('/lens-booking/api/invoices', '', parse_url($request_uri, PHP_URL_PATH));

// Get ID from URL if present
$id = null;
if (preg_match('/^\/(\d+)$/', $endpoint, $matches)) {
    $id = (int)$matches[1];
    $endpoint = '/{id}';
}

switch ($request_method) {
    case 'GET':
        if ($endpoint === '') {
            $invoices_controller->getAll();
        } elseif ($endpoint === '/{id}' && $id) {
            $invoices_controller->getOne($id);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Endpoint not found"]);
        }
        break;
    
    case 'POST':
        if ($endpoint === '') {
            $invoices_controller->create();
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Endpoint not found"]);
        }
        break;
    
    case 'PUT':
        if ($endpoint === '/{id}' && $id) {
            $invoices_controller->update($id);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Endpoint not found"]);
        }
        break;
    
    case 'DELETE':
        if ($endpoint === '/{id}' && $id) {
            $invoices_controller->delete($id);
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
