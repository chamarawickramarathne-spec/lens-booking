<?php
/**
 * CORS Configuration
 * Handles Cross-Origin Resource Sharing for API
 */

function setCORSHeaders() {
    // Allow requests from the React app and common development ports
    $allowed_origins = [
        'https://lensmanager.hireartist.studio', // Production domain
        'http://lensmanager.hireartist.studio', // Production domain (http fallback)
        'http://localhost:8080', // Current Vite dev server port
        'http://localhost:8081',
        'http://localhost:8082',
        'http://localhost:3000',
        'http://127.0.0.1:8080', // Current Vite dev server port
        'http://127.0.0.1:8081',
        'http://127.0.0.1:8082',
        'http://127.0.0.1:3000',
        'http://localhost:5173' // Vite default port
    ];
    
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    // Set CORS headers
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
    } else {
        // Default to the production domain or localhost
        $defaultOrigin = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') 
            ? 'https://lensmanager.hireartist.studio' 
            : 'http://localhost:8080';
        header("Access-Control-Allow-Origin: $defaultOrigin");
    }
    
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400'); // Cache for 1 day
    
    // Ensure we're sending JSON
    header('Content-Type: application/json; charset=UTF-8');
    
    // Add additional headers to help with debugging
    header('X-API-Version: 1.0');
}

function handleCORSPreflight() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        setCORSHeaders();
        // Send a proper JSON response for OPTIONS
        http_response_code(200);
        echo json_encode(['status' => 'OK', 'message' => 'CORS preflight handled']);
        exit();
    }
}

// Auto-apply CORS headers when this file is included
setCORSHeaders();
handleCORSPreflight();
?>