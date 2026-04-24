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
                'download_enabled' => (bool) $g['download_enabled'],
                'favorites_enabled' => (bool) $g['favorites_enabled'],
                'share_enabled' => (bool) $g['share_enabled'],
                'image_count' => $g['image_count'],
                'set_settings' => $this->gallery->getSetSettings($g['id']),
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
                'download_enabled' => (bool) $g['download_enabled'],
                'favorites_enabled' => (bool) $g['favorites_enabled'],
                'share_enabled' => (bool) $g['share_enabled'],
                'sets_enabled' => (bool) ($g['sets_enabled'] ?? true),
                'client_password' => $g['client_password'] ?? null,
                'set_settings' => $this->gallery->getSetSettings($id),
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
        $this->gallery->favorites_enabled = $data['favorites_enabled'] ?? true;
        $this->gallery->share_enabled = $data['share_enabled'] ?? true;
        $this->gallery->sets_enabled = $data['sets_enabled'] ?? true;
        $this->gallery->client_password = $data['client_password'] ?? null;

        if ($this->gallery->create()) {
            http_response_code(201);
            echo json_encode(["message" => "Gallery created", "id" => $this->gallery->id]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Unable to create gallery"]);
        }
    }

    public function update($id)
    {
        try {
            $user_data = $this->auth->getUserFromHeader();
            if (!$user_data) {
                http_response_code(401);
                echo json_encode(["message" => "Access denied"]);
                return;
            }

            // Fetch existing
            $existing = $this->gallery->getById($id, $user_data['user_id']);
            if (!$existing) {
                http_response_code(404);
                echo json_encode(["message" => "Gallery not found"]);
                return;
            }

            $data = json_decode(file_get_contents("php://input"), true);

            $this->gallery->id = $id;
            $this->gallery->user_id = $user_data['user_id'];
            $this->gallery->gallery_name = $data['title'] ?? $existing['gallery_name'];
            $this->gallery->description = $data['description'] ?? $existing['description'];
            $this->gallery->gallery_date = $data['event_date'] ?? $existing['gallery_date'];
            $this->gallery->cover_image = isset($data['cover_image']) ? $data['cover_image'] : $existing['cover_image'];
            $this->gallery->is_public = isset($data['is_public']) ? $data['is_public'] : $existing['is_public'];
            $this->gallery->password_protected = isset($data['password_protected']) ? $data['password_protected'] : $existing['password_protected'];
            $this->gallery->gallery_password = isset($data['gallery_password']) ? $data['gallery_password'] : $existing['gallery_password'];
            $this->gallery->download_enabled = isset($data['download_enabled']) ? $data['download_enabled'] : $existing['download_enabled'];
            $this->gallery->favorites_enabled = isset($data['favorites_enabled']) ? $data['favorites_enabled'] : $existing['favorites_enabled'];
            $this->gallery->share_enabled = isset($data['share_enabled']) ? $data['share_enabled'] : $existing['share_enabled'];
            $this->gallery->sets_enabled = isset($data['sets_enabled']) ? $data['sets_enabled'] : ($existing['sets_enabled'] ?? true);
            $this->gallery->client_password = isset($data['client_password']) ? $data['client_password'] : $existing['client_password'];
            $this->gallery->expiry_date = isset($data['expiry_date']) ? $data['expiry_date'] : $existing['expiry_date'];

            if ($this->gallery->update()) {
                echo json_encode(["message" => "Gallery updated"]);
            } else {
                http_response_code(500);
                $errorInfo = $this->db->errorInfo();
                echo json_encode([
                    "message" => "Unable to update gallery",
                    "error" => $errorInfo[2] ?? "Unknown database error"
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Internal Server Error",
                "error" => $e->getMessage(),
                "file" => $e->getFile(),
                "line" => $e->getLine()
            ]);
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
            // Delete the physical gallery directory and its contents
            $dirpath = dirname(__DIR__) . '/uploads/galleries/' . $id;
            if (is_dir($dirpath)) {
                $files = array_diff(scandir($dirpath), array('.', '..'));
                foreach ($files as $file) {
                    $filepath = "$dirpath/$file";
                    if (is_file($filepath)) {
                        unlink($filepath);
                    }
                }
                rmdir($dirpath);
            }

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
        // First try to fetch as a public gallery
        $g = $this->gallery->getPublicById($id);

        // Check if user is logged in
        $user_data = $this->auth->getUserFromHeader();

        // If not public, check if the logged-in user is the owner (so they can preview their private galleries)
        if (!$g && $user_data) {
            $g = $this->gallery->getById($id, $user_data['user_id']);
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
                'favorites_enabled' => (bool) $g['favorites_enabled'],
                'share_enabled' => (bool) $g['share_enabled'],
                'sets_enabled' => (bool) ($g['sets_enabled'] ?? true),
                'client_password' => $g['client_password'] ?? null,
                'password_required' => (bool) $g['password_protected'],
                'created_at' => $g['created_at'],
                'photographer' => [
                    'name' => $g['photographer_name'],
                    'business_name' => $g['business_name'],
                    'image' => $g['photographer_image'],
                    'business_email' => $g['business_email'],
                    'business_phone' => $g['business_phone'],
                    'personal_email' => $g['personal_email'],
                    'personal_phone' => $g['personal_phone'],
                    'address' => $g['business_address'],
                    'website' => $g['website'],
                    'portfolio' => $g['portfolio_url']
                ],
                'set_settings' => $this->gallery->getSetSettings($id)
            ];

            // Only return images if not password protected OR if correct password is provided
            $provided_password = $_GET['password'] ?? null;
            $is_owner = ($user_data && $user_data['user_id'] == $g['user_id']);
            
            // Check if password matches EITHER global gallery password OR client password
            $has_correct_password = ($provided_password && (
                $provided_password === $g['gallery_password'] || 
                ($g['client_password'] && $provided_password === $g['client_password'])
            ));
            
            $is_unlocked = $is_owner || $has_correct_password;
            
            $can_view = !$g['password_protected'] || $is_unlocked;

            if ($can_view) {
                $images = $this->gallery->getImages($id);
                $formatted['images'] = array_map(function ($img) {
                    return [
                        'id' => $img['id'],
                        'image_url' => $img['image_url'],
                        'image_name' => $img['image_name'],
                        'set_name' => $img['set_name'] ?? 'Highlights',
                        'likes_count' => (int) ($img['likes_count'] ?? 0),
                        'created_at' => $img['created_at']
                    ];
                }, $images);
                $formatted['unlocked'] = $is_unlocked;
            } else {
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

        // Fetch image path before deleting from DB
        $stmt = $this->db->prepare("SELECT image_url FROM gallery_images WHERE id = ? AND gallery_id = ?");
        $stmt->execute([$image_id, $gallery_id]);
        $img = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($this->gallery->deleteImage($image_id, $gallery_id)) {
            // Remove the physical file
            if ($img && !empty($img['image_url'])) {
                $filepath = dirname(__DIR__) . '/' . ltrim($img['image_url'], '/');
                if (file_exists($filepath) && is_file($filepath)) {
                    unlink($filepath);
                }
            }

            echo json_encode(["message" => "Image deleted"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Unable to delete image"]);
        }
    }

    public function uploadImage($id)
    {
        try {
            $user_data = $this->auth->getUserFromHeader();
            if (!$user_data) {
                http_response_code(401);
                echo json_encode(["message" => "Access denied"]);
                return;
            }

            if (!$this->db) {
                http_response_code(500);
                echo json_encode(["message" => "Database connection failed"]);
                return;
            }

            if (!isset($_FILES['gallery_image'])) {
                http_response_code(400);
                echo json_encode(["message" => "No file uploaded"]);
                return;
            }

            $file = $_FILES['gallery_image'];

            // Handle PHP upload errors
            if ($file['error'] !== UPLOAD_ERR_OK) {
                $error_messages = [
                    UPLOAD_ERR_INI_SIZE => 'The uploaded file exceeds the upload_max_filesize directive in php.ini',
                    UPLOAD_ERR_FORM_SIZE => 'The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form',
                    UPLOAD_ERR_PARTIAL => 'The uploaded file was only partially uploaded',
                    UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                    UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder',
                    UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                    UPLOAD_ERR_EXTENSION => 'A PHP extension stopped the file upload'
                ];
                $msg = $error_messages[$file['error']] ?? 'Unknown upload error';
                http_response_code(400);
                echo json_encode(["message" => $msg]);
                return;
            }

            // 1. Validate file type (only JPEG allowed)
            $allowed_types = ['image/jpeg', 'image/jpg'];
            $mime_type = '';

            if (function_exists('finfo_open')) {
                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                if ($finfo) {
                    $mime_type = finfo_file($finfo, $file['tmp_name']);
                    finfo_close($finfo);
                }
            }

            if (empty($mime_type) && function_exists('mime_content_type')) {
                $mime_type = mime_content_type($file['tmp_name']);
            }

            if (empty($mime_type)) {
                // Fallback to basic extension check
                $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                if ($ext === 'jpg' || $ext === 'jpeg') {
                    $mime_type = 'image/jpeg';
                }
            }

            if (!in_array($mime_type, $allowed_types)) {
                http_response_code(400);
                echo json_encode(["message" => "Only JPEG images are allowed. Detected: " . $mime_type]);
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
                if (!mkdir($upload_dir, 0777, true)) {
                    error_log("Failed to create directory: " . $upload_dir);
                    http_response_code(500);
                    echo json_encode(["message" => "Failed to create upload directory"]);
                    return;
                }
            }

            $filename = time() . '_' . preg_replace("/[^a-zA-Z0-9.]/", "_", basename($file['name']));
            $filepath = $upload_dir . $filename;

            $set_name = $_POST['set_name'] ?? 'Highlights';

            if (move_uploaded_file($file['tmp_name'], $filepath)) {
                $web_path = 'uploads/galleries/' . $id . '/' . $filename;
                if ($this->gallery->addImage($id, $web_path, $file['name'], $file['size'], $set_name)) {
                    echo json_encode(["message" => "Image uploaded", "url" => $web_path]);
                } else {
                    error_log("Database error: Failed to save image record for gallery " . $id);
                    http_response_code(500);
                    echo json_encode(["message" => "Failed to save image record"]);
                }
            } else {
                error_log("File upload error: Failed to move file to " . $filepath);
                http_response_code(500);
                echo json_encode(["message" => "Failed to move uploaded file"]);
            }
        } catch (Exception $e) {
            error_log("Upload Exception: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(["message" => "Internal server error during upload", "details" => $e->getMessage()]);
        }
    }

    public function likeImage($image_id)
    {
        if ($this->gallery->likeImage($image_id)) {
            echo json_encode(["message" => "Image liked"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Failed to like image"]);
        }
    }
    public function updateSetVisibility($gallery_id)
    {
        $user_data = $this->auth->getUserFromHeader();
        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        $data = json_decode(file_get_contents("php://input"), true);
        $set_name = $data['set_name'] ?? null;
        $is_public = $data['is_public'] ?? true;

        if (!$set_name) {
            http_response_code(400);
            echo json_encode(["message" => "Set name is required"]);
            return;
        }

        if ($this->gallery->updateSetSetting($gallery_id, $set_name, $is_public)) {
            echo json_encode(["message" => "Set visibility updated"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Unable to update set visibility"]);
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

if (preg_match('/^\/(\d+)\/sets\/visibility$/', $endpoint, $matches)) {
    $id = (int) $matches[1];
    $sub = 'sets-visibility';
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
} elseif (preg_match('/^\/(\d+)\/images\/(\d+)\/like$/', $endpoint, $matches)) {
    $id = (int) $matches[1];
    $sub = 'like';
    $sub_id = (int) $matches[2];
} elseif (preg_match('/^\/(\d+)$/', $endpoint, $matches)) {
    $id = (int) $matches[1];
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
        if ($sub === 'sets-visibility')
            $controller->updateSetVisibility($id);
        elseif ($sub === 'upload')
            $controller->uploadImage($id);
        elseif ($sub === 'like' && $sub_id)
            $controller->likeImage($sub_id);
        else
            $controller->create();
        break;
    case 'DELETE':
        if ($sub === 'images' && $sub_id)
            $controller->deleteImage($id, $sub_id);
        elseif ($id)
            $controller->delete($id);
        break;
    case 'PUT':
        if ($id)
            $controller->update($id);
        break;
    default:
        http_response_code(405);
        break;
}
