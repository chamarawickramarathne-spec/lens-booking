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

class ClientsController {
    private $database;
    private $db;
    private $client;
    private $access_level;
    private $auth;

    public function __construct() {
        $this->database = new Database();
        $this->db = $this->database->getConnection();
        $this->client = new Client($this->db);
        $this->access_level = new AccessLevel($this->db);
        $this->auth = new JWTAuth();
    }

    /**
     * Get all clients
     */
    public function getAll() {
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
    public function getOne($id) {
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
    public function create() {
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
    public function update($id) {
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
    public function delete($id) {
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
            $verify_query = "SELECT id FROM clients WHERE id = :id AND photographer_id = :photographer_id";
            $verify_stmt = $this->db->prepare($verify_query);
            $verify_stmt->bindParam(':id', $client_id);
            $verify_stmt->bindParam(':photographer_id', $photographer_id);
            $verify_stmt->execute();

            if ($verify_stmt->rowCount() === 0) {
                $this->db->rollBack();
                http_response_code(404);
                echo json_encode(["message" => "Client not found"]);
                return;
            }

            // Get all booking IDs for this client
            $booking_query = "SELECT id FROM bookings WHERE client_id = :client_id AND photographer_id = :photographer_id";
            $booking_stmt = $this->db->prepare($booking_query);
            $booking_stmt->bindParam(':client_id', $client_id);
            $booking_stmt->bindParam(':photographer_id', $photographer_id);
            $booking_stmt->execute();
            $bookings = $booking_stmt->fetchAll(PDO::FETCH_ASSOC);
            $booking_ids = array_column($bookings, 'id');

            // Get all invoice IDs for this client
            $invoice_query = "SELECT id FROM invoices WHERE client_id = :client_id AND photographer_id = :photographer_id";
            $invoice_stmt = $this->db->prepare($invoice_query);
            $invoice_stmt->bindParam(':client_id', $client_id);
            $invoice_stmt->bindParam(':photographer_id', $photographer_id);
            $invoice_stmt->execute();
            $invoices = $invoice_stmt->fetchAll(PDO::FETCH_ASSOC);
            $invoice_ids = array_column($invoices, 'id');

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
                $delete_invoices_query = "DELETE FROM invoices WHERE id IN ($placeholders)";
                $delete_invoices_stmt = $this->db->prepare($delete_invoices_query);
                $delete_invoices_stmt->execute($invoice_ids);
            }

            // Delete bookings
            if (!empty($booking_ids)) {
                $placeholders = implode(',', array_fill(0, count($booking_ids), '?'));
                $delete_bookings_query = "DELETE FROM bookings WHERE id IN ($placeholders)";
                $delete_bookings_stmt = $this->db->prepare($delete_bookings_query);
                $delete_bookings_stmt->execute($booking_ids);
            }

            // Finally, delete the client
            if ($this->client->delete($id, $user_data['user_id'])) {
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

    public function getClientDeletionInfo($id) {
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
            $booking_query = "SELECT COUNT(*) as count FROM bookings WHERE client_id = :client_id AND photographer_id = :photographer_id";
            $booking_stmt = $this->db->prepare($booking_query);
            $booking_stmt->bindParam(':client_id', $client_id);
            $booking_stmt->bindParam(':photographer_id', $photographer_id);
            $booking_stmt->execute();
            $booking_count = $booking_stmt->fetch(PDO::FETCH_ASSOC)['count'];

            // Count invoices
            $invoice_query = "SELECT COUNT(*) as count FROM invoices WHERE client_id = :client_id AND photographer_id = :photographer_id";
            $invoice_stmt = $this->db->prepare($invoice_query);
            $invoice_stmt->bindParam(':client_id', $client_id);
            $invoice_stmt->bindParam(':photographer_id', $photographer_id);
            $invoice_stmt->execute();
            $invoice_count = $invoice_stmt->fetch(PDO::FETCH_ASSOC)['count'];

            // Count payments
            $payment_query = "SELECT COUNT(*) as count FROM payments p 
                            INNER JOIN invoices i ON p.invoice_id = i.id 
                            WHERE i.client_id = :client_id AND i.photographer_id = :photographer_id";
            $payment_stmt = $this->db->prepare($payment_query);
            $payment_stmt->bindParam(':client_id', $client_id);
            $payment_stmt->bindParam(':photographer_id', $photographer_id);
            $payment_stmt->execute();
            $payment_count = $payment_stmt->fetch(PDO::FETCH_ASSOC)['count'];

            http_response_code(200);
            echo json_encode([
                "client" => $client,
                "related_data" => [
                    "bookings" => (int)$booking_count,
                    "invoices" => (int)$invoice_count,
                    "payments" => (int)$payment_count
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

// Remove base path and get endpoint
$endpoint = str_replace('/api/clients', '', parse_url($request_uri, PHP_URL_PATH));

// Get ID from URL if present
$id = null;
if (preg_match('/^\/(\d+)\/deletion-info$/', $endpoint, $matches)) {
    $id = (int)$matches[1];
    $endpoint = '/{id}/deletion-info';
} elseif (preg_match('/^\/(\d+)$/', $endpoint, $matches)) {
    $id = (int)$matches[1];
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