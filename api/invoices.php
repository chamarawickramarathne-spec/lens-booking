<?php
/**
 * Invoices Controller
 * Handles invoice management endpoints
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

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
                         c.full_name as client_name, c.email as client_email, 
                         c.phone as client_phone, c.address as client_address,
                         b.title as booking_title, b.booking_date
                     FROM " . $this->table_name . " i
                     LEFT JOIN clients c ON i.client_id = c.id
                     LEFT JOIN bookings b ON i.booking_id = b.id
                     WHERE i.user_id = :user_id
                     ORDER BY i.created_at DESC";

                 $stmt = $this->db->prepare($query);
                 $stmt->bindParam(":user_id", $user_data['user_id']);
            $stmt->execute();

            $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Format the response to match frontend expectations
            $formatted_invoices = array_map(function($invoice) {
                return [
                    'id' => $invoice['id'],
                    'booking_id' => $invoice['booking_id'],
                    'amount' => $invoice['total_amount'] ?? 0, // Frontend expects 'amount' field
                    'due_date' => $invoice['due_date'],
                    'status' => $invoice['status'],
                    'created_at' => $invoice['created_at'],
                    'updated_at' => $invoice['updated_at'],
                    'user_id' => $invoice['user_id'],
                    'client_id' => $invoice['client_id'],
                    'invoice_number' => $invoice['invoice_number'],
                    'issue_date' => $invoice['invoice_date'],
                    'subtotal' => $invoice['subtotal'] ?? 0,
                    'tax_amount' => $invoice['tax_amount'] ?? 0,
                    'total_amount' => $invoice['total_amount'] ?? 0,
                    'notes' => $invoice['notes'] ?? '',
                    'payment_date' => $invoice['payment_date'] ?? null,
                    'deposit_amount' => $invoice['deposit_amount'] ?? 0,
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
                         c.full_name as client_name, c.email as client_email, 
                         c.phone as client_phone, c.address as client_address,
                         b.title as booking_title, b.booking_date
                     FROM " . $this->table_name . " i
                     LEFT JOIN clients c ON i.client_id = c.id
                     LEFT JOIN bookings b ON i.booking_id = b.id
                     WHERE i.id = :id AND i.user_id = :user_id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":id", $id);
            $stmt->bindParam(":user_id", $user_data['user_id']);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
                
                $formatted_invoice = [
                    'id' => $invoice['id'],
                    'booking_id' => $invoice['booking_id'],
                    'amount' => $invoice['total_amount'] ?? 0, // Frontend expects 'amount' field
                    'due_date' => $invoice['due_date'],
                    'status' => $invoice['status'],
                    'created_at' => $invoice['created_at'],
                    'updated_at' => $invoice['updated_at'],
                    'user_id' => $invoice['user_id'],
                    'client_id' => $invoice['client_id'],
                    'invoice_number' => $invoice['invoice_number'],
                    'issue_date' => $invoice['invoice_date'],
                    'subtotal' => $invoice['subtotal'] ?? 0,
                    'tax_amount' => $invoice['tax_amount'] ?? 0,
                    'total_amount' => $invoice['total_amount'] ?? 0,
                    'notes' => $invoice['notes'] ?? '',
                    'payment_date' => $invoice['payment_date'] ?? null,
                    'deposit_amount' => $invoice['deposit_amount'] ?? 0,
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
                     SET user_id=:user_id, client_id=:client_id, booking_id=:booking_id,
                         invoice_number=:invoice_number, invoice_date=:invoice_date, due_date=:due_date,
                         subtotal=:subtotal, tax_amount=:tax_amount, total_amount=:total_amount,
                         deposit_amount=:deposit_amount, status=:status, notes=:notes";

            $stmt = $this->db->prepare($query);

            $invoice_number = $data['invoice_number'] ?? 'INV-' . date('Ymd') . '-' . rand(1000, 9999);
            $invoice_date = $data['invoice_date'] ?? date('Y-m-d');
            $status = $data['status'] ?? 'draft';

            $stmt->bindParam(":user_id", $user_data['user_id']);
            $stmt->bindParam(":client_id", $data['client_id']);
            $stmt->bindParam(":booking_id", $data['booking_id']);
            $stmt->bindParam(":invoice_number", $invoice_number);
            $stmt->bindParam(":invoice_date", $invoice_date);
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
                           WHERE id = :id AND user_id = :user_id";
            $check_stmt = $this->db->prepare($check_query);
            $check_stmt->bindParam(":id", $id);
            $check_stmt->bindParam(":user_id", $user_data['user_id']);
            $check_stmt->execute();
            $old_invoice = $check_stmt->fetch(PDO::FETCH_ASSOC);
            
            $is_status_changing_to_pending = ($old_invoice && $old_invoice['status'] !== 'pending' && $data['status'] === 'pending');
            $is_status_changing_to_cancelled = ($old_invoice && 
                ($data['status'] === 'cancelled' || $data['status'] === 'cancel_by_client'));

            $query = "UPDATE " . $this->table_name . " 
                     SET client_id=:client_id, booking_id=:booking_id, invoice_date=:invoice_date,
                         due_date=:due_date, subtotal=:subtotal, tax_amount=:tax_amount, 
                         total_amount=:total_amount, deposit_amount=:deposit_amount, 
                         status=:status, notes=:notes, payment_date=:payment_date, 
                         updated_at=CURRENT_TIMESTAMP
                     WHERE id=:id AND user_id=:user_id";

            $stmt = $this->db->prepare($query);

            // Handle optional fields with null coalescing
            $deposit_amount = $data['deposit_amount'] ?? null;
            $payment_date = $data['payment_date'] ?? null;
            $notes = $data['notes'] ?? null;
            // Map 'issue_date' from frontend to 'invoice_date' in database
            $invoice_date = $data['issue_date'] ?? $data['invoice_date'] ?? date('Y-m-d');

            $stmt->bindParam(":client_id", $data['client_id']);
            $stmt->bindParam(":booking_id", $data['booking_id']);
            $stmt->bindParam(":invoice_date", $invoice_date);
            $stmt->bindParam(":due_date", $data['due_date']);
            $stmt->bindParam(":subtotal", $data['subtotal']);
            $stmt->bindParam(":tax_amount", $data['tax_amount']);
            $stmt->bindParam(":total_amount", $data['total_amount']);
            $stmt->bindParam(":deposit_amount", $deposit_amount);
            $stmt->bindParam(":status", $data['status']);
            $stmt->bindParam(":notes", $notes);
            $stmt->bindParam(":payment_date", $payment_date);
            $stmt->bindParam(":id", $id);
            $stmt->bindParam(":user_id", $user_data['user_id']);

            if ($stmt->execute()) {
                // Create payment schedules if status changed to pending
                if ($is_status_changing_to_pending) {
                    // Fetch updated invoice data to get the latest due_date
                    $updated_invoice = $this->getInvoiceData($id, $user_data['user_id']);
                    $this->createPaymentSchedules($id, $updated_invoice, $user_data['user_id']);
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
     * Private helper method to get invoice data
     */
    private function getInvoiceData($id, $photographer_id) {
        try {
            $query = "SELECT * FROM " . $this->table_name . " 
                     WHERE id = :id AND user_id = :user_id";
            
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":id", $id);
            $stmt->bindParam(":user_id", $photographer_id);
            $stmt->execute();
            
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Failed to get invoice data: " . $e->getMessage());
            return null;
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
            $delete_query = "DELETE FROM payment_schedules WHERE invoice_id = :invoice_id";
            $delete_stmt = $this->db->prepare($delete_query);
            $delete_stmt->bindParam(":invoice_id", $invoice_id);
            if (!$delete_stmt->execute()) {
                throw new Exception("Failed to delete existing payment schedules");
            }
            
            // Create deposit payment if there's a deposit amount
            if ($deposit_amount > 0) {
                // Use today's date or a custom date for deposit
                $deposit_due_date = date('Y-m-d');
                $status = 'pending';
                
                $deposit_query = "INSERT INTO payment_schedules 
                                (invoice_id, booking_id, user_id, schedule_name, schedule_type,
                                 due_date, amount, paid_amount, status, payment_date, payment_method, notes)
                                VALUES 
                                (:invoice_id, :booking_id, :user_id, :schedule_name, :schedule_type,
                                 :due_date, :amount, 0, :status, NULL, NULL, NULL)";
                
                $deposit_stmt = $this->db->prepare($deposit_query);
                $deposit_stmt->bindParam(":invoice_id", $invoice_id);
                $deposit_stmt->bindParam(":booking_id", $invoice_data['booking_id']);
                $deposit_stmt->bindParam(":user_id", $photographer_id);
                $schedule_name = 'Deposit Payment';
                $deposit_stmt->bindParam(":schedule_name", $schedule_name);
                $schedule_type = 'deposit';
                $deposit_stmt->bindParam(":schedule_type", $schedule_type);
                $deposit_stmt->bindParam(":due_date", $deposit_due_date);
                $deposit_stmt->bindParam(":amount", $deposit_amount);
                $deposit_stmt->bindParam(":status", $status);
                
                if (!$deposit_stmt->execute()) {
                    throw new Exception("Failed to create deposit payment schedule: " . $deposit_stmt->errorInfo()[2]);
                }
            }
            
            // Create final payment schedule for remaining amount
            if ($remaining_amount > 0) {
                // Use invoice due_date for final payment, or default to +30 days
                $final_due_date = $invoice_data['due_date'] ?? date('Y-m-d', strtotime('+30 days'));
                $status = 'pending';
                
                $final_query = "INSERT INTO payment_schedules 
                               (invoice_id, booking_id, user_id, schedule_name, schedule_type,
                                due_date, amount, paid_amount, status, payment_date, payment_method, notes)
                               VALUES 
                               (:invoice_id, :booking_id, :user_id, :schedule_name, :schedule_type,
                                :due_date, :amount, 0, :status, NULL, NULL, NULL)";
                
                $final_stmt = $this->db->prepare($final_query);
                $final_stmt->bindParam(":invoice_id", $invoice_id);
                $final_stmt->bindParam(":booking_id", $invoice_data['booking_id']);
                $final_stmt->bindParam(":user_id", $photographer_id);
                $schedule_name = 'Final Payment';
                $final_stmt->bindParam(":schedule_name", $schedule_name);
                $schedule_type = 'final';
                $final_stmt->bindParam(":schedule_type", $schedule_type);
                $final_stmt->bindParam(":due_date", $final_due_date);
                $final_stmt->bindParam(":amount", $remaining_amount);
                $final_stmt->bindParam(":status", $status);
                
                if (!$final_stmt->execute()) {
                    throw new Exception("Failed to create final payment schedule: " . $final_stmt->errorInfo()[2]);
                }
            }
            
            error_log("Payment schedules created successfully for invoice {$invoice_id}");
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
            // Delete all payment schedules for this invoice (schema status enum lacks cancelled)
            $delete_query = "DELETE FROM payment_schedules WHERE invoice_id = :invoice_id";
            $delete_stmt = $this->db->prepare($delete_query);
            $delete_stmt->bindParam(":invoice_id", $invoice_id);
            $delete_stmt->execute();

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
                     WHERE id = :id AND user_id = :user_id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":id", $id);
            $stmt->bindParam(":user_id", $user_data['user_id']);

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
$endpoint = str_replace('/lens-booking/lens-booking/api/invoices', '', parse_url($request_uri, PHP_URL_PATH));

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
