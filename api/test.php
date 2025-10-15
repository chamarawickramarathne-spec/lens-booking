<?php
/**
 * Simple test for the register API endpoint
 */

// Include centralized CORS configuration
require_once 'config/cors.php';
handleCORSPreflight();

// Test API connection
echo json_encode([
    "status" => "success",
    "message" => "API test endpoint is working",
    "timestamp" => date('Y-m-d H:i:s'),
    "server_info" => [
        "php_version" => phpversion(),
        "server_software" => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'
    ]
]);
?>