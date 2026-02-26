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

class InvoiceEmailController
{
    private $database;
    private $db;
    private $auth;
    private $envelope_from = 'noreply@lensmanager.hireartist.studio';
    private $logFile;

    public function __construct()
    {
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
    public function sendInvoiceEmail()
    {
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
                         c.full_name as client_name, c.email as client_email,
                         b.title as booking_title
                     FROM invoices i
                     LEFT JOIN clients c ON i.client_id = c.id
                     LEFT JOIN bookings b ON i.booking_id = b.id
                     WHERE i.id = :invoice_id AND i.user_id = :user_id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(":invoice_id", $data->invoice_id);
            $stmt->bindParam(":user_id", $user_data['user_id']);
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
            $userQuery = "SELECT full_name, email, phone, business_name, business_email, business_phone, business_address
                          FROM users WHERE id = :user_id";
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
            $subject = "Invoice #{$invoice['invoice_number']} from " . ($photographer['business_name'] ?: ($photographer['full_name'] ?? 'Lens Manager'));

            $businessName = $photographer['business_name'] ?: ($photographer['full_name'] ?? 'Lens Manager');
            $contactEmail = $photographer['business_email'] ?: $photographer['email'];
            $contactPhone = $photographer['business_phone'] ?: $photographer['phone'];

            // Create email plain-text message
            $message = "Dear {$invoice['client_name']},\n\n";
            $message .= "Please find attached your invoice #{$invoice['invoice_number']}.\n\n";
            $message .= "Invoice Details:\n";
            $message .= "- Invoice Number: {$invoice['invoice_number']}\n";
            $message .= "- Issue Date: " . date('M d, Y', strtotime($invoice['invoice_date'])) . "\n";
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

            // LOG SERVER VARS FOR DEBUGGING ENVIRONMENT DETECTION
            $this->log('debug', 'Server environment check', [
                'HTTP_HOST' => $_SERVER['HTTP_HOST'] ?? 'n/a',
                'SERVER_NAME' => $_SERVER['SERVER_NAME'] ?? 'n/a',
                'SERVER_ADDR' => $_SERVER['SERVER_ADDR'] ?? 'n/a',
                'REMOTE_ADDR' => $_SERVER['REMOTE_ADDR'] ?? 'n/a',
            ]);

            // Determine From headers
            // RELAY FIX: The 'From' address MUST be a local domain email (e.g., @lensmanager.hireartist.studio)
            // otherwise the server rejects it with "Relaying not permitted".
            $fromEmail = $this->envelope_from; // Always use local domain email
            $fromName = $businessName ?: 'Lens Manager';
            $replyToEmail = $contactEmail ?: $fromEmail;

            // ATTACHMENT HANDLING: Re-enabling after successful relay test
            $attachmentBytes = null;
            $attachmentName = null;
            $attachmentMime = 'application/pdf';

            if (isset($data->pdf_base64) && $data->pdf_base64) {
                $base64 = $data->pdf_base64;
                if (strpos($base64, 'base64,') !== false) {
                    $base64 = substr($base64, strpos($base64, 'base64,') + 7);
                }
                $decoded = base64_decode($base64, true);
                if ($decoded !== false && strlen($decoded) > 0) {
                    $attachmentBytes = $decoded;
                    $attachmentName = ($data->file_name ?? ("invoice-" . $invoice['invoice_number'] . ".pdf"));
                }
            }

            // Build headers and body
            $email = $this->buildEmail($fromName, $fromEmail, $to, $subject, $message, $attachmentBytes, $attachmentName, $attachmentMime, $replyToEmail);

            $this->log('info', 'Attempting to send invoice email (with Attachment)', [
                'user_id' => $user_data['user_id'] ?? null,
                'invoice_id' => $data->invoice_id,
                'to' => $to,
                'from' => $fromEmail,
                'reply_to' => $replyToEmail,
                'subject' => $subject,
                'attachment_present' => (bool) $attachmentBytes,
                'attachment_size' => $attachmentBytes ? strlen($attachmentBytes) : 0,
            ]);


            // Detect environment more robustly
            // If the host contains 'hireartist.studio', it's definitely NOT local
            $host = $_SERVER['HTTP_HOST'] ?? '';
            $isProduction = (strpos($host, 'hireartist.studio') !== false);

            $isLocal = !$isProduction && (
                ($host === 'localhost' ||
                    ($_SERVER['SERVER_NAME'] ?? '') === 'localhost' ||
                    ($_SERVER['SERVER_ADDR'] ?? '') === '127.0.0.1' ||
                    ($_SERVER['SERVER_ADDR'] ?? '') === '::1') ||
                (strpos($host, 'localhost:') === 0)
            );

            if ($isLocal) {
                // In development, just log the email and mark invoice as sent
                $this->logEmailToFile($to, $subject, $email['body'], $email['headers'], $attachmentBytes, $attachmentName);
                $this->log('info', 'Development mode: email logged instead of sent', [
                    'to' => $to,
                    'subject' => $subject,
                    'invoice_number' => $invoice['invoice_number'] ?? null,
                ]);

                // Update invoice status to sent after successful logging
                $this->markInvoiceAsSent($data->invoice_id, $user_data['user_id']);

                http_response_code(200);
                echo json_encode([
                    "message" => "Invoice emailed (logged in DEV mode)",
                    "data" => [
                        "sent_to" => $to,
                        "invoice_number" => $invoice['invoice_number'],
                        "status" => 'sent',
                        "dev_mode" => true
                    ]
                ]);
            } else {
                // In production, actually send the email
                $additionalParams = '-f ' . escapeshellarg($this->envelope_from);

                // Attempt to send with encoded subject
                $emailSent = @mail($to, $email['subject'], $email['body'], $email['headers'], $additionalParams);

                if (!$emailSent) {
                    // Fallback attempt without -f
                    @ini_set('sendmail_from', $this->envelope_from);
                    $emailSent = @mail($to, $email['subject'], $email['body'], $email['headers']);
                }

                if ($emailSent) {
                    $this->log('info', 'Invoice email sent successfully via mail()', [
                        'user_id' => $user_data['user_id'] ?? null,
                        'invoice_id' => $data->invoice_id,
                        'to' => $to,
                        'attachment' => (bool) $attachmentBytes,
                    ]);

                    // Update invoice status to sent
                    $this->markInvoiceAsSent($data->invoice_id, $user_data['user_id']);

                    http_response_code(200);
                    echo json_encode([
                        "message" => "Invoice email with attachment sent successfully",
                        "data" => [
                            "sent_to" => $to,
                            "invoice_number" => $invoice['invoice_number'],
                            "status" => 'sent',
                            "attachment" => $attachmentBytes ? true : false
                        ]
                    ]);
                } else {

                    $this->log('error', 'mail() function returned FALSE in production', [
                        'to' => $to,
                        'from' => $fromEmail,
                        'subject' => $subject,
                    ]);

                    http_response_code(200); // Return 200 to show status update attempt
                    echo json_encode([
                        "message" => "Invoice status updated, but server failed to send email.",
                        "data" => [
                            "sent_to" => $to,
                            "invoice_number" => $invoice['invoice_number'],
                            "email_error" => true,
                            "debug_info" => "Server mail() returned false"
                        ]
                    ]);
                }
            }

        } catch (Exception $e) {
            http_response_code(500);
            $this->log('error', 'Exception while sending invoice email', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            echo json_encode([
                "message" => "Failed to send invoice email due to server error",
                "error" => $e->getMessage()
            ]);
        }
    }

    /**
     * Mark invoice status as sent (skip if already paid/cancelled)
     */
    private function markInvoiceAsSent($invoice_id, $user_id)
    {
        try {
            // Update status to 'sent' if it's currently 'draft' or 'sent'
            // If it's 'pending', keep it as 'pending' (pending payment)
            // If it's 'paid' or 'cancelled', don't touch it
            $update = "UPDATE invoices 
                       SET status = CASE 
                            WHEN status = 'draft' THEN 'sent'
                            ELSE status 
                       END, 
                       updated_at = CURRENT_TIMESTAMP
                       WHERE id = :invoice_id AND user_id = :user_id
                         AND status NOT IN ('paid', 'cancelled')";

            $stmt = $this->db->prepare($update);
            $stmt->bindParam(":invoice_id", $invoice_id);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->execute();
        } catch (Exception $e) {
            $this->log('error', 'Failed to update invoice status to sent', [
                'invoice_id' => $invoice_id,
                'user_id' => $user_id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Build email headers and body. Uses multipart/mixed when attachmentBytes provided.
     */
    private function buildEmail($fromName, $fromEmail, $to, $subject, $textBody, $attachmentBytes = null, $attachmentName = null, $attachmentMime = 'application/pdf', $replyToEmail = null)
    {
        // Encode headers for UTF-8 support
        $encodedFromName = '=?UTF-8?B?' . base64_encode($fromName) . '?=';
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

        $headers = [];
        $headers[] = 'From: ' . $encodedFromName . ' <' . $fromEmail . '>';
        $headers[] = 'Reply-To: ' . ($replyToEmail ?: $fromEmail);
        $headers[] = 'MIME-Version: 1.0';
        $headers[] = 'X-Mailer: PHP/' . phpversion();

        if ($attachmentBytes) {
            $boundary = 'PMS_' . md5(time()); // Photographer Management System
            $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundary . '"';

            $body = "This is a multi-part message in MIME format.\r\n\r\n";

            // Text part
            $body .= '--' . $boundary . "\r\n";
            $body .= 'Content-Type: text/plain; charset=UTF-8' . "\r\n";
            $body .= 'Content-Transfer-Encoding: 8bit' . "\r\n\r\n";
            $body .= $textBody . "\r\n\r\n";

            // Attachment part
            $safeName = $attachmentName ?: 'invoice.pdf';

            $body .= '--' . $boundary . "\r\n";
            $body .= 'Content-Type: ' . $attachmentMime . '; name="' . $safeName . '"' . "\r\n";
            $body .= 'Content-Transfer-Encoding: base64' . "\r\n";
            $body .= 'Content-Disposition: attachment; filename="' . $safeName . '"' . "\r\n\r\n";
            $body .= chunk_split(base64_encode($attachmentBytes), 76, "\r\n") . "\r\n";

            // End boundary
            $body .= '--' . $boundary . '--';
        } else {
            // No attachment; simple text email
            $headers[] = 'Content-Type: text/plain; charset=UTF-8';
            $headers[] = 'Content-Transfer-Encoding: 8bit';
            $body = $textBody;
        }

        return [
            'headers' => implode("\r\n", $headers),
            'body' => $body,
            'subject' => $encodedSubject, // Add encoded subject to the return array
        ];
    }


    /**
     * Write a structured JSON log line to logs/invoice-email.log
     */
    private function log($level, $message, array $context = [])
    {
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

    /**
     * Log email to dedicated file in development mode
     */
    private function logEmailToFile($to, $subject, $body, $headers, $attachmentBytes = null, $attachmentName = null)
    {
        $logFile = __DIR__ . '/../logs/email.log';
        $logDir = dirname($logFile);
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }

        $logEntry = "\n" . str_repeat('=', 80) . "\n";
        $logEntry .= "[" . date('Y-m-d H:i:s') . "] INVOICE EMAIL LOGGED (DEV MODE)\n";
        $logEntry .= str_repeat('-', 80) . "\n";
        $logEntry .= "To: " . $to . "\n";
        $logEntry .= "Subject: " . $subject . "\n";
        if ($attachmentBytes) {
            $logEntry .= "Attachment: " . $attachmentName . " (" . strlen($attachmentBytes) . " bytes)\n";
        }
        $logEntry .= "Headers:\n" . $headers . "\n";
        $logEntry .= str_repeat('-', 80) . "\n";
        $logEntry .= "Body:\n" . substr($body, 0, 2000) . (strlen($body) > 2000 ? "\n... (truncated)" : "") . "\n";
        $logEntry .= str_repeat('=', 80) . "\n";

        @file_put_contents($logFile, $logEntry, FILE_APPEND);
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
