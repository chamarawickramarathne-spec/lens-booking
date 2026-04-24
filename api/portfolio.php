<?php
/**
 * Portfolio Controller
 * Handles public portfolio data fetching
 */

require_once 'config/cors.php';
require_once 'config/database.php';
require_once 'models/User.php';
require_once 'models/Gallery.php';

class PortfolioController
{
    private $db;
    private $user;
    private $gallery;

    public function __construct()
    {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->user = new User($this->db);
        $this->gallery = new Gallery($this->db);
    }

    public function getPublicPortfolio($id)
    {
        // Fetch user data
        $userData = $this->user->getById($id);
        if (!$userData) {
            http_response_code(404);
            echo json_encode(["message" => "Photographer not found"]);
            return;
        }

        // Fetch public galleries for this user
        $galleries = $this->gallery->getByUserId($id);
        
        // Filter only public galleries
        $publicGalleries = array_filter($galleries, function($g) {
            return (bool)$g['is_public'];
        });

        // Format galleries
        $formattedGalleries = array_map(function($g) {
            return [
                'id' => $g['id'],
                'title' => $g['gallery_name'],
                'description' => $g['description'],
                'event_date' => $g['gallery_date'],
                'cover_image' => $g['cover_image'] ?: $g['first_image'],
                'image_count' => $g['image_count'],
                'created_at' => $g['created_at']
            ];
        }, array_values($publicGalleries));

        $response = [
            'photographer' => [
                'name' => $userData['full_name'],
                'business_name' => $userData['business_name'],
                'image' => $userData['profile_picture'],
                'bio' => $userData['bio'],
                'business_email' => $userData['business_email'],
                'business_phone' => $userData['business_phone'],
                'personal_email' => $userData['email'],
                'personal_phone' => $userData['phone'],
                'address' => $userData['business_address'],
                'website' => $userData['website'],
                'portfolio' => $userData['portfolio_url']
            ],
            'collections' => $formattedGalleries
        ];

        echo json_encode($response);
    }
}

// Route handling
$controller = new PortfolioController();
$method = $_SERVER["REQUEST_METHOD"];
$request_uri = $_SERVER['REQUEST_URI'];

$path = parse_url($request_uri, PHP_URL_PATH);
$api_path = '/api/portfolio';
$api_pos = strpos($path, $api_path);
$endpoint = $api_pos !== false ? substr($path, $api_pos + strlen($api_path)) : $path;

if ($method === 'GET' && preg_match('/^\/(\d+)$/', $endpoint, $matches)) {
    $controller->getPublicPortfolio((int)$matches[1]);
} else {
    http_response_code(404);
    echo json_encode(["message" => "Endpoint not found"]);
}
