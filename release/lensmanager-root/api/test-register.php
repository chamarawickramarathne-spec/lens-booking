<?php
/**
 * Test registration endpoint directly
 */

// Set CORS headers explicitly
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

echo json_encode([
    "status" => "success",
    "message" => "Register test endpoint is accessible",
    "method" => $_SERVER['REQUEST_METHOD'],
    "headers" => getallheaders(),
    "post_data" => file_get_contents("php://input")
]);
?>