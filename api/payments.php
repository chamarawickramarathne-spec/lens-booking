<?php
/**
 * Payments Controller
 * Handles payment schedules management endpoints
 */

// Include CORS configuration first
require_once 'config/cors.php';

require_once 'config/database.php';
require_once 'middleware/auth.php';

class PaymentsController
{
    private $database;
    private $db;
    private $auth;
    private $table_name = "payment_schedules";

    public function __construct()
    {
        $this->database = new Database();
        $this->db = $this->database->getConnection();
        $this->auth = new JWTAuth();
    }

    /**
     * Get all payments
     */
    public function getAll()
    {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        try {
            $query = "SELECT p.*, 
                         i.invoice_number, i.client_id AS invoice_client_id,
                         b.title AS booking_title, b.client_id AS booking_client_id,
                         c1.full_name AS booking_client_name,
                         c2.full_name AS invoice_client_name
                     FROM " . $this->table_name . " p
                     LEFT JOIN invoices i ON p.invoice_id = i.id
                     LEFT JOIN bookings b ON p.booking_id = b.id
                     LEFT JOIN clients c1 ON b.client_id = c1.id
                     LEFT JOIN clients c2 ON i.client_id = c2.id
                     WHERE p.user_id = :user_id
                     ORDER BY p.due_date ASC, p.created_at DESC";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":user_id", $user_data['user_id']);
            $stmt->execute();

            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Format the response to match frontend expectations
            $formatted_payments = array_map(function ($payment) {
                return [
                    'id' => $payment['id'],
                    'user_id' => $payment['user_id'],
                    'invoice_id' => $payment['invoice_id'],
                    'booking_id' => $payment['booking_id'],
                    'schedule_name' => $payment['schedule_name'],
                    'schedule_type' => $payment['schedule_type'] ?? null,
                    'due_date' => $payment['due_date'],
                    'amount' => (float) $payment['amount'],
                    'paid_amount' => (float) ($payment['paid_amount'] ?? 0),
                    'status' => $payment['status'],
                    'payment_date' => $payment['payment_date'],
                    'payment_method' => $payment['payment_method'],
                    'notes' => $payment['notes'],
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
     * Get installments for a payment schedule
     */
    public function getInstallments($scheduleId)
    {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        try {
            $query = "SELECT id, payment_schedule_id, amount, paid_date, payment_method, notes, created_at
                      FROM payment_installments
                      WHERE payment_schedule_id = :schedule_id AND user_id = :user_id
                      ORDER BY paid_date ASC, id ASC";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":schedule_id", $scheduleId);
            $stmt->bindParam(":user_id", $user_data['user_id']);
            $stmt->execute();

            $installments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            http_response_code(200);
            echo json_encode([
                "message" => "Installments retrieved successfully",
                "data" => $installments
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to retrieve installments",
                "error" => $e->getMessage()
            ]);
        }
    }

    /**
     * Get all installments for current user
     */
    public function getAllInstallments()
    {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        try {
            $query = "SELECT i.*, 
                             b.title AS booking_title,
                             COALESCE(c1.full_name, c2.full_name) AS client_name,
                             COALESCE(c1.id, c2.id) AS client_id
                      FROM payment_installments i
                      LEFT JOIN payment_schedules p ON i.payment_schedule_id = p.id
                      LEFT JOIN bookings b ON p.booking_id = b.id
                      LEFT JOIN invoices inv ON p.invoice_id = inv.id
                      LEFT JOIN clients c1 ON b.client_id = c1.id
                      LEFT JOIN clients c2 ON inv.client_id = c2.id
                      WHERE i.user_id = :user_id
                      ORDER BY i.paid_date DESC, i.id DESC";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":user_id", $user_data['user_id']);
            $stmt->execute();

            $installments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            http_response_code(200);
            echo json_encode([
                "message" => "All installments retrieved successfully",
                "data" => $installments
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to retrieve installments",
                "error" => $e->getMessage()
            ]);
        }
    }

    /**
     * Add an installment to a payment schedule
     */
    public function addInstallment($scheduleId)
    {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['amount'])) {
            http_response_code(400);
            echo json_encode(["message" => "Installment amount is required"]);
            return;
        }

        try {
            // Verify schedule ownership and get schedule details
            $scheduleQuery = "SELECT id, user_id, amount, paid_amount, status, schedule_type, invoice_id
                              FROM " . $this->table_name . "
                              WHERE id = :id AND user_id = :user_id";
            $scheduleStmt = $this->db->prepare($scheduleQuery);
            $scheduleStmt->bindParam(":id", $scheduleId);
            $scheduleStmt->bindParam(":user_id", $user_data['user_id']);
            $scheduleStmt->execute();

            if ($scheduleStmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(["message" => "Payment schedule not found"]);
                return;
            }

            $schedule = $scheduleStmt->fetch(PDO::FETCH_ASSOC);

            $this->db->beginTransaction();

            $amount = $data['amount'];
            $paid_date = $data['paid_date'] ?? date('Y-m-d');
            $payment_method = $data['payment_method'] ?? null;
            $notes = $data['notes'] ?? null;

            $insertQuery = "INSERT INTO payment_installments
                            SET user_id = :user_id, payment_schedule_id = :schedule_id,
                                amount = :amount, paid_date = :paid_date,
                                payment_method = :payment_method, notes = :notes";

            $insertStmt = $this->db->prepare($insertQuery);
            $insertStmt->bindParam(":user_id", $user_data['user_id']);
            $insertStmt->bindParam(":schedule_id", $scheduleId);
            $insertStmt->bindParam(":amount", $amount);
            $insertStmt->bindParam(":paid_date", $paid_date);
            $insertStmt->bindParam(":payment_method", $payment_method);
            $insertStmt->bindParam(":notes", $notes);
            $insertStmt->execute();

            // Recalculate paid amount
            $sumQuery = "SELECT COALESCE(SUM(amount), 0) AS total_paid
                         FROM payment_installments
                         WHERE payment_schedule_id = :schedule_id AND user_id = :user_id";
            $sumStmt = $this->db->prepare($sumQuery);
            $sumStmt->bindParam(":schedule_id", $scheduleId);
            $sumStmt->bindParam(":user_id", $user_data['user_id']);
            $sumStmt->execute();
            $sumResult = $sumStmt->fetch(PDO::FETCH_ASSOC);
            $totalPaid = (float) ($sumResult['total_paid'] ?? 0);

            $status = $totalPaid >= (float) $schedule['amount'] ? 'paid' : 'pending';

            $updateQuery = "UPDATE " . $this->table_name . "
                            SET paid_amount = :paid_amount, status = :status,
                                payment_date = :payment_date, updated_at = CURRENT_TIMESTAMP
                            WHERE id = :id AND user_id = :user_id";

            $updateStmt = $this->db->prepare($updateQuery);
            $updateStmt->bindParam(":paid_amount", $totalPaid);
            $updateStmt->bindParam(":status", $status);
            $updateStmt->bindParam(":payment_date", $paid_date);
            $updateStmt->bindParam(":id", $scheduleId);
            $updateStmt->bindParam(":user_id", $user_data['user_id']);
            $updateStmt->execute();

            $this->db->commit();

            http_response_code(201);
            echo json_encode([
                "message" => "Installment added successfully",
                "data" => [
                    "paid_amount" => $totalPaid,
                    "status" => $status
                ]
            ]);
        } catch (Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to add installment",
                "error" => $e->getMessage()
            ]);
        }
    }

    /**
     * Get single payment
     */
    public function getOne($id)
    {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        try {
            $query = "SELECT p.*, 
                         i.invoice_number, i.client_id AS invoice_client_id,
                         b.title AS booking_title, b.client_id AS booking_client_id,
                         c1.full_name AS booking_client_name,
                         c2.full_name AS invoice_client_name
                     FROM " . $this->table_name . " p
                     LEFT JOIN invoices i ON p.invoice_id = i.id
                     LEFT JOIN bookings b ON p.booking_id = b.id
                     LEFT JOIN clients c1 ON b.client_id = c1.id
                     LEFT JOIN clients c2 ON i.client_id = c2.id
                     WHERE p.id = :id AND p.user_id = :user_id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":id", $id);
            $stmt->bindParam(":user_id", $user_data['user_id']);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                $payment = $stmt->fetch(PDO::FETCH_ASSOC);

                $formatted_payment = [
                    'id' => $payment['id'],
                    'user_id' => $payment['user_id'],
                    'invoice_id' => $payment['invoice_id'],
                    'booking_id' => $payment['booking_id'],
                    'schedule_name' => $payment['schedule_name'],
                    'schedule_type' => $payment['schedule_type'] ?? null,
                    'due_date' => $payment['due_date'],
                    'amount' => (float) $payment['amount'],
                    'paid_amount' => (float) ($payment['paid_amount'] ?? 0),
                    'status' => $payment['status'],
                    'payment_date' => $payment['payment_date'],
                    'payment_method' => $payment['payment_method'],
                    'notes' => $payment['notes'],
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
    public function create()
    {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['schedule_name']) || !isset($data['amount'])) {
            http_response_code(400);
            echo json_encode(["message" => "Schedule name and amount are required"]);
            return;
        }

        try {
            $query = "INSERT INTO " . $this->table_name . " 
                     SET user_id=:user_id, invoice_id=:invoice_id, booking_id=:booking_id,
                         schedule_name=:schedule_name, schedule_type=:schedule_type, due_date=:due_date,
                         amount=:amount, paid_amount=:paid_amount, status=:status,
                         payment_date=:payment_date, payment_method=:payment_method,
                         notes=:notes";

            $stmt = $this->db->prepare($query);

            // Handle optional fields with null coalescing - MUST assign to variables first
            // because bindParam() requires references, not expressions
            $status = $data['status'] ?? 'pending';
            $invoice_id = $data['invoice_id'] ?? null;
            $booking_id = $data['booking_id'] ?? null;
            $schedule_name = $data['schedule_name'] ?? null;
            $schedule_type = $data['schedule_type'] ?? null;
            $due_date = $data['due_date'] ?? null;
            $amount = $data['amount'] ?? null;
            $payment_date = $data['payment_date'] ?? null;
            $payment_method = $data['payment_method'] ?? null;
            $notes = $data['notes'] ?? null;
            $paid_amount = $data['paid_amount'] ?? 0;

            $stmt->bindParam(":user_id", $user_data['user_id']);
            $stmt->bindParam(":invoice_id", $invoice_id);
            $stmt->bindParam(":booking_id", $booking_id);
            $stmt->bindParam(":schedule_name", $schedule_name);
            $stmt->bindParam(":schedule_type", $schedule_type);
            $stmt->bindParam(":due_date", $due_date);
            $stmt->bindParam(":amount", $amount);
            $stmt->bindParam(":paid_amount", $paid_amount);
            $stmt->bindParam(":status", $status);
            $stmt->bindParam(":payment_date", $payment_date);
            $stmt->bindParam(":payment_method", $payment_method);
            $stmt->bindParam(":notes", $notes);

            if ($stmt->execute()) {
                http_response_code(201);
                echo json_encode([
                    "message" => "Payment created successfully",
                    "payment_id" => $this->db->lastInsertId()
                ]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Unable to create payment", "error" => $stmt->errorInfo()[2]]);
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
    public function update($id)
    {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        try {
            // Handle optional fields with null coalescing - MUST assign to variables first
            // because bindParam() requires references, not expressions
            $invoice_id = $data['invoice_id'] ?? null;
            $booking_id = $data['booking_id'] ?? null;
            $schedule_name = $data['schedule_name'] ?? null;
            $payment_date = $data['payment_date'] ?? null;
            $payment_method = $data['payment_method'] ?? null;
            $notes = $data['notes'] ?? null;
            $paid_amount = $data['paid_amount'] ?? 0;
            $schedule_type = $data['schedule_type'] ?? null;
            $due_date = $data['due_date'] ?? null;
            $amount = $data['amount'] ?? null;
            $status = $data['status'] ?? null;

            // Auto-set status to "paid" if paid_amount equals amount
            if ($paid_amount > 0 && $amount > 0 && $paid_amount >= $amount) {
                $status = 'paid';
                // Set payment_date to today if not provided and status is being set to paid
                if (!$payment_date) {
                    $payment_date = date('Y-m-d');
                }
            }

            $query = "UPDATE " . $this->table_name . " 
                     SET invoice_id=:invoice_id, booking_id=:booking_id,
                         schedule_name=:schedule_name, schedule_type=:schedule_type, due_date=:due_date,
                         amount=:amount, paid_amount=:paid_amount, status=:status,
                         payment_date=:payment_date, payment_method=:payment_method,
                         notes=:notes,
                         updated_at=CURRENT_TIMESTAMP
                     WHERE id=:id AND user_id=:user_id";

            $stmt = $this->db->prepare($query);

            $stmt->bindParam(":invoice_id", $invoice_id);
            $stmt->bindParam(":booking_id", $booking_id);
            $stmt->bindParam(":schedule_name", $schedule_name);
            $stmt->bindParam(":schedule_type", $schedule_type);
            $stmt->bindParam(":due_date", $due_date);
            $stmt->bindParam(":amount", $amount);
            $stmt->bindParam(":paid_amount", $paid_amount);
            $stmt->bindParam(":status", $status);
            $stmt->bindParam(":payment_date", $payment_date);
            $stmt->bindParam(":payment_method", $payment_method);
            $stmt->bindParam(":notes", $notes);
            $stmt->bindParam(":id", $id);
            $stmt->bindParam(":user_id", $user_data['user_id']);

            if ($stmt->execute()) {
                http_response_code(200);
                echo json_encode(["message" => "Payment updated successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Unable to update payment", "error" => $stmt->errorInfo()[2]]);
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
    public function delete($id)
    {
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

// Remove base path and get endpoint accurately even in subdirectories
$path = parse_url($request_uri, PHP_URL_PATH);
$path = str_replace('//', '/', $path); // Normalize double slashes
$api_path = '/api/payments';
$api_pos = strpos($path, $api_path);
if ($api_pos !== false) {
    $endpoint = substr($path, $api_pos + strlen($api_path));
} else {
    $endpoint = $path;
}

// Get ID from URL if present
$id = null;
$isInstallmentsEndpoint = false;
if (preg_match('/^\/installments$/', $endpoint)) {
    $endpoint = '/installments';
} elseif (preg_match('/^\/(\d+)\/(installments)$/', $endpoint, $matches)) {
    $id = (int) $matches[1];
    $isInstallmentsEndpoint = true;
    $endpoint = '/{id}/installments';
} elseif (preg_match('/^\/(\d+)$/', $endpoint, $matches)) {
    $id = (int) $matches[1];
    $endpoint = '/{id}';
}

switch ($request_method) {
    case 'GET':
        if ($endpoint === '') {
            $payments_controller->getAll();
        } elseif ($endpoint === '/installments') {
            $payments_controller->getAllInstallments();
        } elseif ($endpoint === '/{id}' && $id) {
            $payments_controller->getOne($id);
        } elseif ($endpoint === '/{id}/installments' && $id) {
            $payments_controller->getInstallments($id);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Endpoint not found"]);
        }
        break;

    case 'POST':
        if ($endpoint === '') {
            $payments_controller->create();
        } elseif ($endpoint === '/{id}/installments' && $id) {
            $payments_controller->addInstallment($id);
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