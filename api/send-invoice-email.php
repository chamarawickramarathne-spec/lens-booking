<?php
/**
 * Send Invoice Email
 * Handles sending invoice PDF via email to client
 */

// Include CORS configuration first
require_once 'config/cors.php';

// Set CORS headers and handle preflight
setCORSHeaders();
handleCORSPreflight();

require_once 'config/database.php';
require_once 'middleware/auth.php';

// Load Composer autoloader for PHPMailer (if using Composer)
// If not using Composer, you'll need to include PHPMailer files manually
// require_once 'vendor/autoload.php';

// For now, we'll use PHP's built-in mail() function
// In production, you should use PHPMailer or similar

class InvoiceEmailController {
    private $database;
    private $db;
    private $auth;

    public function __construct() {
        $this->database = new Database();
        $this->db = $this->database->getConnection();
        $this->auth = new JWTAuth();
    }

    /**
     * Send invoice email to client
     */
    public function sendInvoiceEmail() {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        // Get POST data
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->invoice_id)) {
            http_response_code(400);
            echo json_encode(["message" => "Invoice ID is required"]);
            return;
        }

        try {
            // Get invoice details
            $query = "SELECT i.*, 
                             c.name as client_name, c.email as client_email,
                             b.title as booking_title
                      FROM invoices i
                      LEFT JOIN clients c ON i.client_id = c.id
                      LEFT JOIN bookings b ON i.booking_id = b.id
                      WHERE i.id = :invoice_id AND i.photographer_id = :photographer_id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":invoice_id", $data->invoice_id);
            $stmt->bindParam(":photographer_id", $user_data['user_id']);
            $stmt->execute();

            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$invoice) {
                http_response_code(404);
                echo json_encode(["message" => "Invoice not found"]);
                return;
            }

            // Get photographer details
            $userQuery = "SELECT first_name, last_name, email, phone, business_name, business_email, business_phone
                          FROM users WHERE id = :user_id";
            $userStmt = $this->db->prepare($userQuery);
            $userStmt->bindParam(":user_id", $user_data['user_id']);
            $userStmt->execute();
            $photographer = $userStmt->fetch(PDO::FETCH_ASSOC);

            if (!$invoice['client_email']) {
                http_response_code(400);
                echo json_encode(["message" => "Client email not found"]);
                return;
            }

            // Prepare email
            $to = $invoice['client_email'];
            $subject = "Invoice #{$invoice['invoice_number']} from " . ($photographer['business_name'] ?: ($photographer['first_name'] . ' ' . $photographer['last_name']));
            
            $businessName = $photographer['business_name'] ?: ($photographer['first_name'] . ' ' . $photographer['last_name']);
            $contactEmail = $photographer['business_email'] ?: $photographer['email'];
            $contactPhone = $photographer['business_phone'] ?: $photographer['phone'];

            // Create email message
            $message = "Dear {$invoice['client_name']},\n\n";
            $message .= "Please find attached your invoice #{$invoice['invoice_number']}.\n\n";
            $message .= "Invoice Details:\n";
            $message .= "- Invoice Number: {$invoice['invoice_number']}\n";
            $message .= "- Issue Date: " . date('M d, Y', strtotime($invoice['issue_date'])) . "\n";
            $message .= "- Due Date: " . date('M d, Y', strtotime($invoice['due_date'])) . "\n";
            $message .= "- Total Amount: " . number_format($invoice['total_amount'], 2) . "\n\n";
            
            if ($invoice['booking_title']) {
                $message .= "Service: Photography Service - {$invoice['booking_title']}\n\n";
            }

            $message .= "Please make payment by the due date listed above.\n";
            $message .= "If you have any questions about this invoice, please contact us.\n\n";
            $message .= "Best regards,\n";
            $message .= $businessName . "\n";
            if ($contactEmail) {
                $message .= "Email: " . $contactEmail . "\n";
            }
            if ($contactPhone) {
                $message .= "Phone: " . $contactPhone . "\n";
            }

            // Set headers for plain text email
            $headers = "From: " . ($contactEmail ?: 'noreply@example.com') . "\r\n";
            $headers .= "Reply-To: " . ($contactEmail ?: 'noreply@example.com') . "\r\n";
            $headers .= "X-Mailer: PHP/" . phpversion();

            // Send email using PHP's mail() function
            // Note: In production, you should use PHPMailer or a service like SendGrid
            // For development, we'll just log the email instead of actually sending it
            
            // Check if we're in development mode (no proper mail server)
            $isDevelopment = true; // Set to false in production
            
            if ($isDevelopment) {
                // In development, just log the email and return success
                error_log("=== Invoice Email (Development Mode) ===");
                error_log("To: " . $to);
                error_log("Subject: " . $subject);
                error_log("Message:\n" . $message);
                error_log("=========================================");
                
                http_response_code(200);
                echo json_encode([
                    "message" => "Invoice email logged successfully (Development Mode)",
                    "data" => [
                        "sent_to" => $to,
                        "invoice_number" => $invoice['invoice_number'],
                        "dev_mode" => true
                    ]
                ]);
            } else {
                // In production, actually send the email
                $emailSent = @mail($to, $subject, $message, $headers);
                
                if ($emailSent) {
                    http_response_code(200);
                    echo json_encode([
                        "message" => "Invoice email sent successfully",
                        "data" => [
                            "sent_to" => $to,
                            "invoice_number" => $invoice['invoice_number']
                        ]
                    ]);
                } else {
                    // Return success but warn about email failure
                    http_response_code(200);
                    echo json_encode([
                        "message" => "Invoice status updated. Email notification could not be sent - please check your email server configuration.",
                        "data" => [
                            "sent_to" => $to,
                            "invoice_number" => $invoice['invoice_number'],
                            "email_warning" => true
                        ]
                    ]);
                }
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "message" => "Failed to send invoice email",
                "error" => $e->getMessage()
            ]);
        }
    }
}

// Handle the request
$email_controller = new InvoiceEmailController();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $email_controller->sendInvoiceEmail();
} else {
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed"]);
}
