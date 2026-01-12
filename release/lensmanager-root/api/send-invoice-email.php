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
    private $envelope_from = 'noreply@lensmanager.hireartist.studio';
    private $logFile;

    public function __construct() {
        $this->database = new Database();
        $this->db = $this->database->getConnection();
        $this->auth = new JWTAuth();
        // Initialize dedicated log file for invoice emailing
        $logDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'logs';
        if (!is_dir($logDir)) {
            // Try to create logs directory
            if (!@mkdir($logDir, 0775, true) && !is_dir($logDir)) {
                // Fall back to PHP error_log if directory cannot be created
                error_log('[send-invoice-email] Failed to create logs directory at ' . $logDir);
                $this->logFile = null;
            }
        }
        if (is_dir($logDir)) {
            $this->logFile = $logDir . DIRECTORY_SEPARATOR . 'invoice-email.log';
        }
    }

    /**
     * Send invoice email to client
     */
    public function sendInvoiceEmail() {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            $this->log('warning', 'Unauthorized attempt to send invoice email', [
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
            ]);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        // Get POST data
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->invoice_id)) {
            http_response_code(400);
            $this->log('warning', 'Missing invoice_id in request', [
                'user_id' => $user_data['user_id'] ?? null,
            ]);
            echo json_encode(["message" => "Invoice ID is required"]);
            return;
        }

        try {
            $this->log('info', 'Invoice email request received', [
                'user_id' => $user_data['user_id'] ?? null,
                'invoice_id' => $data->invoice_id,
            ]);
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
                $this->log('warning', 'Invoice not found or not owned by user', [
                    'user_id' => $user_data['user_id'] ?? null,
                    'invoice_id' => $data->invoice_id,
                ]);
                echo json_encode(["message" => "Invoice not found"]);
                return;
            }

            // Get photographer details
            $userQuery = "SELECT first_name, last_name, email, phone, business_name, business_email, business_phone
                          FROM photographers WHERE id = :user_id";
            $userStmt = $this->db->prepare($userQuery);
            $userStmt->bindParam(":user_id", $user_data['user_id']);
            $userStmt->execute();
            $photographer = $userStmt->fetch(PDO::FETCH_ASSOC);

            if (!$invoice['client_email']) {
                http_response_code(400);
                $this->log('warning', 'Client email missing for invoice', [
                    'user_id' => $user_data['user_id'] ?? null,
                    'invoice_id' => $data->invoice_id,
                ]);
                echo json_encode(["message" => "Client email not found"]);
                return;
            }

            // Prepare email basics
            $to = $invoice['client_email'];
            $subject = "Invoice #{$invoice['invoice_number']} from " . ($photographer['business_name'] ?: ($photographer['first_name'] . ' ' . $photographer['last_name']));
            
            $businessName = $photographer['business_name'] ?: ($photographer['first_name'] . ' ' . $photographer['last_name']);
            $contactEmail = $photographer['business_email'] ?: $photographer['email'];
            $contactPhone = $photographer['business_phone'] ?: $photographer['phone'];

            // Create email plain-text message
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

            // Determine From headers (use business email if available; fall back to noreply)
            $fromEmail = $contactEmail ?: $this->envelope_from;
            $fromName = $businessName ?: 'Lens Manager';

            // Attachment handling: accept base64 PDF in request OR send without attachment
            $attachmentBytes = null;
            $attachmentName = null;
            $attachmentMime = 'application/pdf';

            if (isset($data->pdf_base64) && $data->pdf_base64) {
                $base64 = $data->pdf_base64;
                // Strip data URI prefix if present
                if (strpos($base64, 'base64,') !== false) {
                    $base64 = substr($base64, strpos($base64, 'base64,') + 7);
                }
                $decoded = base64_decode($base64, true);
                if ($decoded !== false && strlen($decoded) > 0) {
                    $attachmentBytes = $decoded;
                    $attachmentName = ($data->file_name ?? ("invoice-" . $invoice['invoice_number'] . ".pdf"));
                }
            }

            // Build headers and body (multipart/mixed if attachment provided)
            $email = $this->buildEmail($fromName, $fromEmail, $to, $subject, $message, $attachmentBytes, $attachmentName, $attachmentMime);

            $this->log('info', 'Attempting to send invoice email', [
                'user_id' => $user_data['user_id'] ?? null,
                'invoice_id' => $data->invoice_id,
                'to' => $to,
                'from' => $fromEmail,
                'subject' => $subject,
                'attachment' => (bool)$attachmentBytes,
                'attachment_name' => $attachmentName,
                'attachment_size' => $attachmentBytes ? strlen($attachmentBytes) : 0,
            ]);

            // Send email using PHP's mail() function
            // Note: In production, you should use PHPMailer or a service like SendGrid
            // For development, we'll just log the email instead of actually sending it
            
            // Check if we're in development mode (no proper mail server)
            $isDevelopment = false; // Set to false in production
            
            if ($isDevelopment) {
                // In development, just log the email and return success
                $this->log('info', 'Development mode: email logged instead of sent', [
                    'to' => $to,
                    'subject' => $subject,
                    'attachment' => (bool)$attachmentBytes,
                    'invoice_number' => $invoice['invoice_number'] ?? null,
                ]);
                
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
                // In production, actually send the email (with envelope sender for deliverability)
                $additionalParams = '-f ' . escapeshellarg($this->envelope_from);
                $emailSent = @mail($to, $subject, $email['body'], $email['headers'], $additionalParams);
                if (!$emailSent) {
                    // Fallback attempt without -f (Windows/hosts behavior)
                    @ini_set('sendmail_from', $this->envelope_from);
                    $emailSent = @mail($to, $subject, $email['body'], $email['headers']);
                }
                
                if ($emailSent) {
                    $this->log('info', 'Invoice email sent successfully', [
                        'user_id' => $user_data['user_id'] ?? null,
                        'invoice_id' => $data->invoice_id,
                        'to' => $to,
                        'attachment' => (bool)$attachmentBytes,
                    ]);
                    http_response_code(200);
                    echo json_encode([
                        "message" => "Invoice email sent successfully",
                        "data" => [
                            "sent_to" => $to,
                            "invoice_number" => $invoice['invoice_number'],
                            "attachment" => $attachmentBytes ? ($attachmentName ?: true) : false
                        ]
                    ]);
                } else {
                    // Return success but warn about email failure
                    $this->log('error', 'mail() failed to send invoice email', [
                        'user_id' => $user_data['user_id'] ?? null,
                        'invoice_id' => $data->invoice_id,
                        'to' => $to,
                        'from' => $fromEmail,
                        'subject' => $subject,
                        'attachment' => (bool)$attachmentBytes,
                    ]);
                    http_response_code(200);
                    echo json_encode([
                        "message" => "Invoice status updated, but failed to send email to client.",
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
            $this->log('error', 'Exception while sending invoice email', [
                'error' => $e->getMessage(),
            ]);
            echo json_encode([
                "message" => "Failed to send invoice email",
                "error" => $e->getMessage()
            ]);
        }
    }

    /**
     * Build email headers and body. Uses multipart/mixed when attachmentBytes provided.
     */
    private function buildEmail($fromName, $fromEmail, $to, $subject, $textBody, $attachmentBytes = null, $attachmentName = null, $attachmentMime = 'application/pdf') {
        $headers = [];
        $headers[] = 'From: ' . $fromName . ' <' . $fromEmail . '>';
        $headers[] = 'Reply-To: ' . $fromEmail;
        $headers[] = 'MIME-Version: 1.0';

        if ($attachmentBytes) {
            $boundary = 'b1_' . md5(uniqid('', true));
            $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundary . '"';

            $body = '';
            // Text part
            $body .= '--' . $boundary . "\r\n";
            $body .= 'Content-Type: text/plain; charset=UTF-8' . "\r\n";
            $body .= 'Content-Transfer-Encoding: 7bit' . "\r\n\r\n";
            $body .= $textBody . "\r\n\r\n";

            // Attachment part
            $safeName = $attachmentName ?: 'invoice.pdf';
            $body .= '--' . $boundary . "\r\n";
            $body .= 'Content-Type: ' . $attachmentMime . '; name="' . addslashes($safeName) . '"' . "\r\n";
            $body .= 'Content-Transfer-Encoding: base64' . "\r\n";
            $body .= 'Content-Disposition: attachment; filename="' . addslashes($safeName) . '"' . "\r\n\r\n";
            $body .= chunk_split(base64_encode($attachmentBytes)) . "\r\n";

            // End boundary
            $body .= '--' . $boundary . '--';
        } else {
            // No attachment; simple text email
            $headers[] = 'Content-Type: text/plain; charset=UTF-8';
            $body = $textBody;
        }

        return [
            'headers' => implode("\r\n", $headers),
            'body' => $body,
        ];
    }

    /**
     * Write a structured JSON log line to logs/invoice-email.log
     */
    private function log($level, $message, array $context = []) {
        $entry = [
            'time' => date('c'),
            'level' => $level,
            'message' => $message,
        ] + $context;
        $line = json_encode($entry, JSON_UNESCAPED_SLASHES) . PHP_EOL;

        // Attempt to write to dedicated invoice log first
        if ($this->logFile) {
            // Ensure directory still exists (shared hosting may clean up)
            $dir = dirname($this->logFile);
            if (!is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }
            $result = @file_put_contents($this->logFile, $line, FILE_APPEND);
            if ($result !== false) {
                return;
            }
            // If writing failed, note it in error_log and fall back
            error_log('[send-invoice-email] Failed to write to ' . $this->logFile . ' (falling back to PHP error_log)');
        }

        // Fallback to PHP error_log
        error_log('[send-invoice-email] ' . $line);
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
