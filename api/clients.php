<?php
/**
 * Clients Controller
 * Handles client CRUD operations
 */

require_once '../config/database.php';
require_once '../config/cors.php';
require_once '../models/Client.php';
require_once '../middleware/auth.php';

class ClientsController {
    private $database;
    private $db;
    private $client;
    private $auth;

    public function __construct() {
        $this->database = new Database();
        $this->db = $this->database->getConnection();
        $this->client = new Client($this->db);
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

        $data = json_decode(file_get_contents("php://input"), true);

        if (!isset($data['full_name'])) {
            http_response_code(400);
            echo json_encode(["message" => "Client name is required"]);
            return;
        }

        // Set client properties
        $this->client->user_id = $user_data['user_id'];
        $this->client->full_name = $data['full_name'];
        $this->client->email = $data['email'] ?? '';
        $this->client->phone = $data['phone'] ?? '';
        $this->client->address = $data['address'] ?? '';
        $this->client->city = $data['city'] ?? '';
        $this->client->state = $data['state'] ?? '';
        $this->client->zip_code = $data['zip_code'] ?? '';
        $this->client->country = $data['country'] ?? 'Sri Lanka';
        $this->client->notes = $data['notes'] ?? '';

        if ($this->client->create()) {
            http_response_code(201);
            echo json_encode([
                "message" => "Client created successfully",
                "client_id" => $this->client->id
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

        // Set client properties
        $this->client->id = $id;
        $this->client->user_id = $user_data['user_id'];
        $this->client->full_name = $data['full_name'] ?? '';
        $this->client->email = $data['email'] ?? '';
        $this->client->phone = $data['phone'] ?? '';
        $this->client->address = $data['address'] ?? '';
        $this->client->city = $data['city'] ?? '';
        $this->client->state = $data['state'] ?? '';
        $this->client->zip_code = $data['zip_code'] ?? '';
        $this->client->country = $data['country'] ?? 'Sri Lanka';
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

        if ($this->client->delete($id, $user_data['user_id'])) {
            http_response_code(200);
            echo json_encode(["message" => "Client deleted successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Unable to delete client"]);
        }
    }
}

// Handle request
$clients_controller = new ClientsController();
$request_method = $_SERVER["REQUEST_METHOD"];
$request_uri = $_SERVER['REQUEST_URI'];

// Remove base path and get endpoint
$endpoint = str_replace('/lens-booking/api/clients', '', parse_url($request_uri, PHP_URL_PATH));

// Get ID from URL if present
$id = null;
if (preg_match('/^\/(\d+)$/', $endpoint, $matches)) {
    $id = (int)$matches[1];
    $endpoint = '/{id}';
}

switch ($request_method) {
    case 'GET':
        if ($endpoint === '') {
            $clients_controller->getAll();
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