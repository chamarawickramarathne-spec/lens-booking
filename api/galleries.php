<?php
/**
 * Galleries Controller
 * Handles gallery management endpoints
 */

require_once 'config/cors.php';
require_once 'config/database.php';
require_once 'models/Gallery.php';
require_once 'models/AccessLevel.php';
require_once 'middleware/auth.php';

class GalleriesController
{
    private $db;
    private $gallery;
    private $auth;

    public function __construct()
    {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->gallery = new Gallery($this->db);
        $this->auth = new JWTAuth();
    }

    public function getAll()
    {
        $user_data = $this->auth->getUserFromHeader();
        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $galleries = $this->gallery->getByUserId($user_data['user_id']);

        $formatted = array_map(function ($g) {
            return [
                'id' => $g['id'],
                'title' => $g['gallery_name'],
                'description' => $g['description'],
                'event_date' => $g['gallery_date'],
                'cover_image' => $g['cover_image'] ?: $g['first_image'],
                'is_public' => (bool) $g['is_public'],
                'image_count' => $g['image_count'],
                'created_at' => $g['created_at']
            ];
        }, $galleries);

        echo json_encode($formatted);
    }

    public function getOne($id)
    {
        $user_data = $this->auth->getUserFromHeader();
        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $g = $this->gallery->getById($id, $user_data['user_id']);
        if ($g) {
            $formatted = [
                'id' => $g['id'],
                'title' => $g['gallery_name'],
                'description' => $g['description'],
                'event_date' => $g['gallery_date'],
                'cover_image' => $g['cover_image'] ?: ($g['first_image'] ?? null),
                'is_public' => (bool) $g['is_public'],
                'created_at' => $g['created_at']
            ];
            echo json_encode($formatted);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Gallery not found"]);
        }
    }

    public function create()
    {
        $user_data = $this->auth->getUserFromHeader();
        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);

        $this->gallery->user_id = $user_data['user_id'];
        $this->gallery->gallery_name = $data['title'] ?? 'New Gallery';
        $this->gallery->description = $data['description'] ?? '';
        $this->gallery->gallery_date = $data['event_date'] ?? date('Y-m-d');
        $this->gallery->booking_id = $data['booking_id'] ?? null;
        $this->gallery->is_public = $data['is_public'] ?? false;

        if ($this->gallery->create()) {
            http_response_code(201);
            echo json_encode(["message" => "Gallery created", "id" => $this->gallery->id]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Unable to create gallery"]);
        }
    }

    public function delete($id)
    {
        $user_data = $this->auth->getUserFromHeader();
        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        if ($this->gallery->delete($id, $user_data['user_id'])) {
            echo json_encode(["message" => "Gallery deleted"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Unable to delete gallery"]);
        }
    }

    public function getImages($id)
    {
        $user_data = $this->auth->getUserFromHeader();
        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $images = $this->gallery->getImages($id);
        echo json_encode($images);
    }

    public function getPublic($id)
    {
        // Check if user is logged in (to allow owner to preview)
        $user_data = $this->auth->getUserFromHeader();

        if ($user_data) {
            $g = $this->gallery->getById($id, $user_data['user_id']);
        } else {
            $g = $this->gallery->getPublicById($id);
        }

        if ($g) {
            $images = $this->gallery->getImages($id);
            $formatted = [
                'id' => $g['id'],
                'title' => $g['gallery_name'],
                'description' => $g['description'],
                'event_date' => $g['gallery_date'],
                'cover_image' => $g['cover_image'] ?: ($g['first_image'] ?? null),
                'is_public' => (bool) $g['is_public'],
                'download_enabled' => (bool) $g['download_enabled'],
                'password_required' => (bool) $g['password_protected'],
                'created_at' => $g['created_at'],
            ];

            // Only return images if not password protected OR if correct password is provided
            $provided_password = $_GET['password'] ?? null;
            $is_owner = ($user_data && $user_data['user_id'] == $g['user_id']);

            if (!$g['password_protected'] || $is_owner || ($provided_password && $provided_password === $g['gallery_password'])) {
                $images = $this->gallery->getImages($id);
                $formatted['images'] = array_map(function ($img) {
                    return [
                        'id' => $img['id'],
                        'image_url' => $img['image_url'],
                        'image_name' => $img['image_name']
                    ];
                }, $images);
                $formatted['unlocked'] = true;
            } else {
                $formatted['images'] = [];
                $formatted['unlocked'] = false;
            }

            echo json_encode($formatted);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Gallery not found or is not public"]);
        }
    }

    public function deleteImage($gallery_id, $image_id)
    {
        $user_data = $this->auth->getUserFromHeader();
        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        if ($this->gallery->deleteImage($image_id, $gallery_id)) {
            echo json_encode(["message" => "Image deleted"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Unable to delete image"]);
        }
    }

    public function uploadImage($id)
    {
        $user_data = $this->auth->getUserFromHeader();
        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        if (!isset($_FILES['gallery_image'])) {
            http_response_code(400);
            echo json_encode(["message" => "No file uploaded"]);
            return;
        }

        $file = $_FILES['gallery_image'];

        // 1. Validate file type (only JPEG allowed)
        $allowed_types = ['image/jpeg', 'image/jpg'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime_type = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mime_type, $allowed_types)) {
            http_response_code(400);
            echo json_encode(["message" => "Only JPEG images are allowed."]);
            return;
        }

        // 2. Validate file size (max 1MB)
        if ($file['size'] > 1048576) { // 1MB in bytes
            http_response_code(400);
            echo json_encode(["message" => "Image must be less than 1MB."]);
            return;
        }

        // 3. Validate storage limits
        $access_level = new AccessLevel($this->db);
        $access_info = $access_level->getUserAccessInfo($user_data['user_id']);

        if ($access_info) {
            $current_bytes = (int) $access_info['current_usage']['storage_bytes'];
            $max_gb = (float) $access_info['access_level']['max_storage_gb'];
            $max_bytes = $max_gb * 1024 * 1024 * 1024;

            if (($current_bytes + $file['size']) > $max_bytes) {
                http_response_code(403);
                echo json_encode(["message" => "Storage limit reached. Clear space or upgrade your plan."]);
                return;
            }
        }

        $upload_dir = dirname(__DIR__) . '/uploads/galleries/' . $id . '/';
        if (!file_exists($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }

        $filename = time() . '_' . preg_replace("/[^a-zA-Z0-9.]/", "_", basename($file['name']));
        $filepath = $upload_dir . $filename;

        if (move_uploaded_file($file['tmp_name'], $filepath)) {
            $web_path = 'uploads/galleries/' . $id . '/' . $filename;
            if ($this->gallery->addImage($id, $web_path, $file['name'], $file['size'])) {
                echo json_encode(["message" => "Image uploaded", "url" => $web_path]);
            } else {
                http_response_code(500);
                echo json_encode(["message" => "Failed to save image record"]);
            }
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to move uploaded file"]);
        }
    }
}

// Route handling
$controller = new GalleriesController();
$method = $_SERVER["REQUEST_METHOD"];
$request_uri = $_SERVER['REQUEST_URI'];

$path = parse_url($request_uri, PHP_URL_PATH);
$api_path = '/api/galleries';
$api_pos = strpos($path, $api_path);
$endpoint = $api_pos !== false ? substr($path, $api_pos + strlen($api_path)) : $path;

$id = null;
$sub = null;
$sub_id = null;

if (preg_match('/^\/(\d+)$/', $endpoint, $matches)) {
    $id = (int) $matches[1];
} elseif (preg_match('/^\/(\d+)\/upload$/', $endpoint, $matches)) {
    $id = (int) $matches[1];
    $sub = 'upload';
} elseif (preg_match('/^\/(\d+)\/images$/', $endpoint, $matches)) {
    $id = (int) $matches[1];
    $sub = 'images';
} elseif (preg_match('/^\/(\d+)\/images\/(\d+)$/', $endpoint, $matches)) {
    $id = (int) $matches[1];
    $sub = 'images';
    $sub_id = (int) $matches[2];
} elseif (preg_match('/^\/(\d+)\/public$/', $endpoint, $matches)) {
    $id = (int) $matches[1];
    $sub = 'public';
}

switch ($method) {
    case 'GET':
        if ($sub === 'images')
            $controller->getImages($id);
        elseif ($sub === 'public')
            $controller->getPublic($id);
        elseif ($id)
            $controller->getOne($id);
        else
            $controller->getAll();
        break;
    case 'POST':
        if ($sub === 'upload')
            $controller->uploadImage($id);
        else
            $controller->create();
        break;
    case 'DELETE':
        if ($sub === 'images' && $sub_id)
            $controller->deleteImage($id, $sub_id);
        elseif ($id)
            $controller->delete($id);
        break;
    default:
        http_response_code(405);
        break;
}
