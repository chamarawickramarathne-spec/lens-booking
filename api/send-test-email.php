<?php
require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/middleware/auth.php';

// Set CORS headers FIRST before any output
setCORSHeaders();

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authenticate user
$auth = new JWTAuth();
$user_data = $auth->getUserFromHeader();

if (!$user_data) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Unauthorized: Invalid or missing token'
    ]);
    exit;
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Validate required fields
if (!isset($input['to']) || !isset($input['subject']) || !isset($input['body'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Missing required fields: to, subject, body'
    ]);
    exit;
}

$to = trim($input['to']);
$subject = trim($input['subject']);
$body = trim($input['body']);

// Validate email
if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid email address'
    ]);
    exit;
}

// Development mode check
$isDevelopment = true; // Set to false in production

if ($isDevelopment) {
    // Log email details instead of sending
    error_log("=== TEST EMAIL (DEV MODE) ===");
    error_log("To: " . $to);
    error_log("Subject: " . $subject);
    error_log("Body: " . $body);
    error_log("=============================");
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Test email logged successfully (development mode)',
        'dev_mode' => true,
        'details' => [
            'to' => $to,
            'subject' => $subject,
            'body_length' => strlen($body)
        ]
    ]);
} else {
    // Production: Actually send the email
    $headers = "From: noreply@yourdomain.com\r\n";
    $headers .= "Reply-To: noreply@yourdomain.com\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();
    
    // Format body with basic HTML
    $htmlBody = "<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <title>" . htmlspecialchars($subject) . "</title>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
        " . nl2br(htmlspecialchars($body)) . "
    </div>
</body>
</html>";
    
    $mailSent = mail($to, $subject, $htmlBody, $headers);
    
    if ($mailSent) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Test email sent successfully'
        ]);
    } else {
        // Still return 200 to avoid CORS issues, but indicate failure
        http_response_code(200);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to send email. Please check your mail server configuration.',
            'warning' => 'mail() function returned false'
        ]);
    }
}
