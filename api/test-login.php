<?php
/**
 * Test Login Endpoint - Debug version
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

echo json_encode([
    'step' => 1,
    'message' => 'Starting login test',
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'request_uri' => $_SERVER['REQUEST_URI']
]);

try {
    // Step 2: Include CORS
    echo "\n";
    require_once 'config/cors.php';
    echo json_encode(['step' => 2, 'message' => 'CORS loaded']);
    
    // Step 3: Include database
    echo "\n";
    require_once 'config/database.php';
    echo json_encode(['step' => 3, 'message' => 'Database config loaded']);
    
    // Step 4: Include models
    echo "\n";
    require_once 'models/User.php';
    echo json_encode(['step' => 4, 'message' => 'User model loaded']);
    
    // Step 5: Include middleware
    echo "\n";
    require_once 'middleware/auth.php';
    echo json_encode(['step' => 5, 'message' => 'Auth middleware loaded']);
    
    // Step 6: Test database connection
    echo "\n";
    $database = new Database();
    $db = $database->getConnection();
    echo json_encode(['step' => 6, 'message' => 'Database connected', 'connected' => $db !== null]);
    
    // Step 7: Parse request body
    echo "\n";
    $data = json_decode(file_get_contents("php://input"), true);
    echo json_encode(['step' => 7, 'message' => 'Request parsed', 'data' => $data]);
    
    // Step 8: Test login
    if ($data && isset($data['email']) && isset($data['password'])) {
        echo "\n";
        $user = new User($db);
        echo json_encode(['step' => 8, 'message' => 'User object created']);
        
        echo "\n";
        $user_data = $user->login($data['email'], $data['password']);
        echo json_encode(['step' => 9, 'message' => 'Login attempted', 'result' => $user_data ? 'success' : 'failed']);
    }
    
} catch (Exception $e) {
    echo "\n";
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>
