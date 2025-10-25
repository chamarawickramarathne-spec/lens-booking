<?php
/**
 * Image Proxy with CORS
 * Serves images with proper CORS headers
 */

// Include CORS configuration
require_once 'config/cors.php';

// Set CORS headers
setCORSHeaders();
handleCORSPreflight();

// Get the image path from query parameter
$imagePath = $_GET['path'] ?? '';

if (empty($imagePath)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Image path is required']);
    exit;
}

// Security: Prevent directory traversal attacks
$imagePath = str_replace(['../', '..\\'], '', $imagePath);

// Remove any leading slashes
$imagePath = ltrim($imagePath, '/\\');

// Build the full path - go up one level from api directory to reach lens-booking root
$fullPath = __DIR__ . '/../' . $imagePath;

// Check if file exists
if (!file_exists($fullPath) || !is_file($fullPath)) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Image not found']);
    exit;
}

// Get the file's MIME type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $fullPath);
finfo_close($finfo);

// Validate that it's an image
$allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
if (!in_array($mimeType, $allowedMimeTypes)) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'File is not a valid image']);
    exit;
}

// Set proper headers for image
header('Content-Type: ' . $mimeType);
header('Content-Length: ' . filesize($fullPath));
header('Cache-Control: public, max-age=86400'); // Cache for 1 day

// Output the image
readfile($fullPath);
exit;
