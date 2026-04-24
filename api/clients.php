<?php
/**
 * Clients Controller
 * Handles client management endpoints
 */

// Include CORS configuration first
require_once 'config/cors.php';

require_once 'config/database.php';
require_once 'config/cors.php';
require_once 'models/Client.php';
require_once 'models/AccessLevel.php';
require_once 'middleware/auth.php';

class ClientsController
{
    private $database;
    private $db;
    private $client;
    private $access_level;
    private $auth;

    public function __construct()
    {
        $this->database = new Database();
        $this->db = $this->database->getConnection();
        $this->client = new Client($this->db);
        $this->access_level = new AccessLevel($this->db);
        $this->auth = new JWTAuth();
    }

    /**
     * Get all clients
     */
    public function getAll()
    {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $clients = $this->client->getByUserId($user_data['user_id']);

        http_response_code(200);
        echo json_encode([
            "message" => "Clients retrieved successfully",
            "data" => $clients
        ]);
    }

    /**
     * Get single client
     */
    public function getOne($id)
    {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $client = $this->client->getById($id, $user_data['user_id']);

        if ($client) {
            http_response_code(200);
            echo json_encode([
                "message" => "Client retrieved successfully",
                "data" => $client
            ]);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Client not found"]);
        }
    }

    /**
     * Create new client
     */
    public function create()
    {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        // Check if user can create more clients
        if (!$this->access_level->canCreateClient($user_data['user_id'])) {
            $access_info = $this->access_level->getUserAccessInfo($user_data['user_id']);
            $max_clients = $access_info['access_level']['max_clients'];
            $plan_name = $access_info['access_level']['name'];

            http_response_code(403);
            echo json_encode([
                "message" => "You've reached your limit of " . $max_clients . " client" . ($max_clients > 1 ? "s" : "") . ".",
                "details" => "Upgrade from " . $plan_name . " to add more clients."
            ]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        // Accept either 'name' or 'full_name' from frontend
        $client_name = $data['name'] ?? $data['full_name'] ?? null;
        if (!$client_name) {
            http_response_code(400);
            echo json_encode(["message" => "Client name is required"]);
            return;
        }

        // Set client properties for correct DB columns
        $this->client->user_id = $user_data['user_id'];
        $this->client->full_name = $client_name;
        $this->client->email = $data['email'] ?? '';
        $this->client->phone = $data['phone'] ?? '';
        $this->client->address = $data['address'] ?? '';
        $this->client->city = $data['city'] ?? '';
        $this->client->state = $data['state'] ?? '';
        $this->client->zip_code = $data['zip_code'] ?? '';
        $this->client->country = $data['country'] ?? 'Sri Lanka';
        $this->client->status = $data['status'] ?? 'active';
        $this->client->notes = $data['notes'] ?? '';

        $result = $this->client->create();
        if ($result === true) {
            http_response_code(201);
            echo json_encode([
                "message" => "Client created successfully",
                "client_id" => $this->client->id
            ]);
        } elseif (is_array($result) && isset($result['error']) && $result['error'] === 'limit_reached') {
            http_response_code(403);
            echo json_encode([
                "message" => $result['message']
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Unable to create client"]);
        }
    }

    /**
     * Update client
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

        // Accept either 'name' or 'full_name' from frontend
        $client_name = $data['name'] ?? $data['full_name'] ?? null;
        if (!$client_name) {
            http_response_code(400);
            echo json_encode(["message" => "Client name is required"]);
            return;
        }

        // Set client properties for correct DB columns
        $this->client->id = $id;
        $this->client->user_id = $user_data['user_id'];
        $this->client->full_name = $client_name;
        $this->client->email = $data['email'] ?? '';
        $this->client->phone = $data['phone'] ?? '';
        $this->client->address = $data['address'] ?? '';
        $this->client->city = $data['city'] ?? '';
        $this->client->state = $data['state'] ?? '';
        $this->client->zip_code = $data['zip_code'] ?? '';
        $this->client->country = $data['country'] ?? 'Sri Lanka';
        $this->client->status = $data['status'] ?? 'active';
        $this->client->notes = $data['notes'] ?? '';

        if ($this->client->update()) {
            http_response_code(200);
            echo json_encode(["message" => "Client updated successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Unable to update client"]);
        }
    }

    /**
     * Delete client
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
            // Start transaction
            $this->db->beginTransaction();

            $client_id = $id;
            $photographer_id = $user_data['user_id'];

            // Verify client belongs to photographer
            $verify_query = "SELECT id FROM clients WHERE id = :id AND user_id = :user_id";
            $verify_stmt = $this->db->prepare($verify_query);
            $verify_stmt->bindParam(':id', $client_id);
            $verify_stmt->bindParam(':user_id', $photographer_id);
            $verify_stmt->execute();

            if ($verify_stmt->rowCount() === 0) {
                $this->db->rollBack();
                http_response_code(404);
                echo json_encode(["message" => "Client not found"]);
                return;
            }

            // Delete related data in order
            
            // 1. Get all IDs to delete
            
            // Get all booking IDs
            $booking_query = "SELECT id FROM bookings WHERE client_id = :client_id AND user_id = :user_id";
            $booking_stmt = $this->db->prepare($booking_query);
            $booking_stmt->bindParam(':client_id', $client_id);
            $booking_stmt->bindParam(':user_id', $photographer_id);
            $booking_stmt->execute();
            $booking_ids = $booking_stmt->fetchAll(PDO::FETCH_COLUMN);

            // Get all invoice IDs
            $invoice_query = "SELECT id FROM invoices WHERE client_id = :client_id AND user_id = :user_id";
            $invoice_stmt = $this->db->prepare($invoice_query);
            $invoice_stmt->bindParam(':client_id', $client_id);
            $invoice_stmt->bindParam(':user_id', $photographer_id);
            $invoice_stmt->execute();
            $invoice_ids = $invoice_stmt->fetchAll(PDO::FETCH_COLUMN);

            // Get all payment schedule IDs linked to these bookings or invoices
            $schedule_ids = [];
            if (!empty($booking_ids) || !empty($invoice_ids)) {
                $conditions = [];
                $params = [':user_id' => $photographer_id];
                
                if (!empty($booking_ids)) {
                    $placeholders = implode(',', array_fill(0, count($booking_ids), '?'));
                    $conditions[] = "booking_id IN ($placeholders)";
                    foreach ($booking_ids as $i => $id_val) $params[] = $id_val;
                }
                
                if (!empty($invoice_ids)) {
                    $placeholders = implode(',', array_fill(0, count($invoice_ids), '?'));
                    $conditions[] = "invoice_id IN ($placeholders)";
                    foreach ($invoice_ids as $i => $id_val) $params[] = $id_val;
                }
                
                if (!empty($conditions)) {
                    $schedule_query = "SELECT id FROM payment_schedules WHERE user_id = ? AND (" . implode(' OR ', $conditions) . ")";
                    $schedule_stmt = $this->db->prepare($schedule_query);
                    $schedule_stmt->execute(array_merge([$photographer_id], !empty($booking_ids) ? $booking_ids : [], !empty($invoice_ids) ? $invoice_ids : []));
                    $schedule_ids = $schedule_stmt->fetchAll(PDO::FETCH_COLUMN);
                }
            }

            // 2. Perform deletions
            
            // Delete payment installments
            if (!empty($schedule_ids)) {
                $placeholders = implode(',', array_fill(0, count($schedule_ids), '?'));
                $delete_installments_query = "DELETE FROM payment_installments WHERE payment_schedule_id IN ($placeholders) AND user_id = ?";
                $delete_installments_stmt = $this->db->prepare($delete_installments_query);
                $delete_installments_stmt->execute(array_merge($schedule_ids, [$photographer_id]));
            }

            // Delete payment schedules
            if (!empty($schedule_ids)) {
                $placeholders = implode(',', array_fill(0, count($schedule_ids), '?'));
                $delete_schedules_query = "DELETE FROM payment_schedules WHERE id IN ($placeholders) AND user_id = ?";
                $delete_schedules_stmt = $this->db->prepare($delete_schedules_query);
                $delete_schedules_stmt->execute(array_merge($schedule_ids, [$photographer_id]));
            }

            // Delete payments related to invoices
            if (!empty($invoice_ids)) {
                $placeholders = implode(',', array_fill(0, count($invoice_ids), '?'));
                $delete_payments_query = "DELETE FROM payments WHERE invoice_id IN ($placeholders)";
                $delete_payments_stmt = $this->db->prepare($delete_payments_query);
                $delete_payments_stmt->execute($invoice_ids);
            }

            // Delete invoices
            if (!empty($invoice_ids)) {
                $placeholders = implode(',', array_fill(0, count($invoice_ids), '?'));
                $delete_invoices_query = "DELETE FROM invoices WHERE id IN ($placeholders) AND user_id = ?";
                $delete_invoices_stmt = $this->db->prepare($delete_invoices_query);
                $delete_invoices_stmt->execute(array_merge($invoice_ids, [$photographer_id]));
            }

            // Delete bookings
            if (!empty($booking_ids)) {
                $placeholders = implode(',', array_fill(0, count($booking_ids), '?'));
                $delete_bookings_query = "DELETE FROM bookings WHERE id IN ($placeholders) AND user_id = ?";
                $delete_bookings_stmt = $this->db->prepare($delete_bookings_query);
                $delete_bookings_stmt->execute(array_merge($booking_ids, [$photographer_id]));
            }

            // Finally, delete the client
            if ($this->client->delete($id, $photographer_id)) {
                $this->db->commit();
                http_response_code(200);
                echo json_encode(["message" => "Client and all related data deleted successfully"]);
            } else {
                $this->db->rollBack();
                http_response_code(500);
                echo json_encode(["message" => "Unable to delete client"]);
            }
        } catch (Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to delete client",
                "error" => $e->getMessage()
            ]);
        }
    }

    public function getClientDeletionInfo($id)
    {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        try {
            $client_id = $id;
            $photographer_id = $user_data['user_id'];

            // Get client info
            $client = $this->client->getById($client_id, $photographer_id);

            if (!$client) {
                http_response_code(404);
                echo json_encode(["message" => "Client not found"]);
                return;
            }

            // Count bookings
            $booking_query = "SELECT COUNT(*) as count FROM bookings WHERE client_id = :client_id AND user_id = :user_id";
            $booking_stmt = $this->db->prepare($booking_query);
            $booking_stmt->bindParam(':client_id', $client_id);
            $booking_stmt->bindParam(':user_id', $photographer_id);
            $booking_stmt->execute();
            $booking_count = $booking_stmt->fetch(PDO::FETCH_ASSOC)['count'];

            // Count invoices
            $invoice_query = "SELECT COUNT(*) as count FROM invoices WHERE client_id = :client_id AND user_id = :user_id";
            $invoice_stmt = $this->db->prepare($invoice_query);
            $invoice_stmt->bindParam(':client_id', $client_id);
            $invoice_stmt->bindParam(':user_id', $photographer_id);
            $invoice_stmt->execute();
            $invoice_count = $invoice_stmt->fetch(PDO::FETCH_ASSOC)['count'];

            // Get IDs for deeper counting
            $booking_ids_query = "SELECT id FROM bookings WHERE client_id = :client_id AND user_id = :user_id";
            $booking_ids_stmt = $this->db->prepare($booking_ids_query);
            $booking_ids_stmt->bindParam(':client_id', $client_id);
            $booking_ids_stmt->bindParam(':user_id', $photographer_id);
            $booking_ids_stmt->execute();
            $booking_ids = $booking_ids_stmt->fetchAll(PDO::FETCH_COLUMN);

            $invoice_ids_query = "SELECT id FROM invoices WHERE client_id = :client_id AND user_id = :user_id";
            $invoice_ids_stmt = $this->db->prepare($invoice_ids_query);
            $invoice_ids_stmt->bindParam(':client_id', $client_id);
            $invoice_ids_stmt->bindParam(':user_id', $photographer_id);
            $invoice_ids_stmt->execute();
            $invoice_ids = $invoice_ids_stmt->fetchAll(PDO::FETCH_COLUMN);

            // Count payment schedules
            $schedule_count = 0;
            $installment_count = 0;
            $schedule_ids = [];
            
            if (!empty($booking_ids) || !empty($invoice_ids)) {
                $conditions = [];
                if (!empty($booking_ids)) {
                    $placeholders = implode(',', array_fill(0, count($booking_ids), '?'));
                    $conditions[] = "booking_id IN ($placeholders)";
                }
                if (!empty($invoice_ids)) {
                    $placeholders = implode(',', array_fill(0, count($invoice_ids), '?'));
                    $conditions[] = "invoice_id IN ($placeholders)";
                }
                
                if (!empty($conditions)) {
                    $schedule_query = "SELECT id FROM payment_schedules WHERE user_id = ? AND (" . implode(' OR ', $conditions) . ")";
                    $schedule_stmt = $this->db->prepare($schedule_query);
                    $schedule_stmt->execute(array_merge([$photographer_id], !empty($booking_ids) ? $booking_ids : [], !empty($invoice_ids) ? $invoice_ids : []));
                    $schedules = $schedule_stmt->fetchAll(PDO::FETCH_ASSOC);
                    $schedule_count = count($schedules);
                    $schedule_ids = array_column($schedules, 'id');
                }
            }

            // Count installments
            if (!empty($schedule_ids)) {
                $placeholders = implode(',', array_fill(0, count($schedule_ids), '?'));
                $installment_query = "SELECT COUNT(*) as count FROM payment_installments WHERE payment_schedule_id IN ($placeholders) AND user_id = ?";
                $installment_stmt = $this->db->prepare($installment_query);
                $installment_stmt->execute(array_merge($schedule_ids, [$photographer_id]));
                $installment_count = $installment_stmt->fetch(PDO::FETCH_ASSOC)['count'];
            }

            // Count payments (original logic)
            $payment_query = "SELECT COUNT(*) as count FROM payments p 
                            INNER JOIN invoices i ON p.invoice_id = i.id 
                            WHERE i.client_id = :client_id AND i.user_id = :user_id";
            $payment_stmt = $this->db->prepare($payment_query);
            $payment_stmt->bindParam(':client_id', $client_id);
            $payment_stmt->bindParam(':user_id', $photographer_id);
            $payment_stmt->execute();
            $payment_count = $payment_stmt->fetch(PDO::FETCH_ASSOC)['count'];

            http_response_code(200);
            echo json_encode([
                "client" => $client,
                "related_data" => [
                    "bookings" => (int) $booking_count,
                    "invoices" => (int) $invoice_count,
                    "payment_schedules" => (int) $schedule_count,
                    "payment_installments" => (int) $installment_count,
                    "payments" => (int) $payment_count
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to get deletion info",
                "error" => $e->getMessage()
            ]);
        }
    }
}

// Handle request
$clients_controller = new ClientsController();
$request_method = $_SERVER["REQUEST_METHOD"];
$request_uri = $_SERVER['REQUEST_URI'];

// Remove base path and get endpoint accurately even in subdirectories
$path = parse_url($request_uri, PHP_URL_PATH);
$path = str_replace('//', '/', $path); // Normalize double slashes
$api_path = '/api/clients';
$api_pos = strpos($path, $api_path);
if ($api_pos !== false) {
    $endpoint = substr($path, $api_pos + strlen($api_path));
} else {
    $endpoint = $path;
}

// Get ID from URL if present
$id = null;
if (preg_match('/^\/(\d+)\/deletion-info$/', $endpoint, $matches)) {
    $id = (int) $matches[1];
    $endpoint = '/{id}/deletion-info';
} elseif (preg_match('/^\/(\d+)$/', $endpoint, $matches)) {
    $id = (int) $matches[1];
    $endpoint = '/{id}';
}

switch ($request_method) {
    case 'GET':
        if ($endpoint === '') {
            $clients_controller->getAll();
        } elseif ($endpoint === '/{id}/deletion-info' && $id) {
            $clients_controller->getClientDeletionInfo($id);
        } elseif ($endpoint === '/{id}' && $id) {
            $clients_controller->getOne($id);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Endpoint not found"]);
        }
        break;

    case 'POST':
        if ($endpoint === '') {
            $clients_controller->create();
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Endpoint not found"]);
        }
        break;

    case 'PUT':
        if ($endpoint === '/{id}' && $id) {
            $clients_controller->update($id);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Endpoint not found"]);
        }
        break;

    case 'DELETE':
        if ($endpoint === '/{id}' && $id) {
            $clients_controller->delete($id);
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