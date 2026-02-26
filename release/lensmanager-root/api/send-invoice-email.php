<?php
/**
 * Send Invoice Email (Release Version - Optimized)
 * Handles sending invoice PDF via email to client
 */

// Include CORS configuration first
require_once 'config/cors.php';

// Set CORS headers and handle preflight
setCORSHeaders();
handleCORSPreflight();

require_once 'config/database.php';
require_once 'middleware/auth.php';

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
            @mkdir($logDir, 0775, true);
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
            $this->log('warning', 'Unauthorized attempt to send invoice email');
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
                echo json_encode(["message" => "Client email not found"]);
                return;
            }

            // Prepare email basics
            $to = $invoice['client_email'];
            $businessName = $photographer['business_name'] ?: ($photographer['full_name'] ?? 'Lens Manager');
            $subject = "Invoice #{$invoice['invoice_number']} from " . $businessName;

            $contactEmail = $photographer['business_email'] ?: $photographer['email'];
            $contactPhone = $photographer['business_phone'] ?: $photographer['phone'];

            // Create email message
            $message = "Dear {$invoice['client_name']},\n\n";
            $message .= "Please find attached your invoice #{$invoice['invoice_number']}.\n\n";
            $message .= "Invoice Details:\n";
            $message .= "- Invoice Number: {$invoice['invoice_number']}\n";
            $message .= "- Total Amount: " . number_format($invoice['total_amount'], 2) . "\n\n";
            $message .= "Best regards,\n";
            $message .= $businessName . "\n";
            if ($contactEmail)
                $message .= "Email: " . $contactEmail . "\n";
            if ($contactPhone)
                $message .= "Phone: " . $contactPhone . "\n";

            // RELAY FIX: From MUST be local domain
            $fromEmail = $this->envelope_from;
            $fromName = $businessName;
            $replyToEmail = $contactEmail ?: $fromEmail;

            // ATTACHMENT HANDLING
            $attachmentBytes = null;
            $attachmentName = null;
            if (isset($data->pdf_base64) && $data->pdf_base64) {
                $base64 = $data->pdf_base64;
                if (strpos($base64, 'base64,') !== false) {
                    $base64 = substr($base64, strpos($base64, 'base64,') + 7);
                }
                $attachmentBytes = base64_decode($base64);
                $attachmentName = ($data->file_name ?? ("invoice-" . $invoice['invoice_number'] . ".pdf"));
            }

            // Build headers and body
            $emailInfo = $this->buildEmail($fromName, $fromEmail, $to, $subject, $message, $attachmentBytes, $attachmentName, $replyToEmail);

            // Detect environment
            $host = $_SERVER['HTTP_HOST'] ?? '';
            $isProduction = (strpos($host, 'hireartist.studio') !== false);

            if (!$isProduction && ($host === 'localhost' || ($_SERVER['SERVER_ADDR'] ?? '') === '127.0.0.1')) {
                $this->log('info', 'Development mode: email logged');
                echo json_encode(["message" => "Invoice emailed (logged in TEST mode)", "data" => ["status" => 'sent']]);
            } else {
                $additionalParams = '-f ' . escapeshellarg($this->envelope_from);
                $emailSent = @mail($to, $emailInfo['subject'], $emailInfo['body'], $emailInfo['headers'], $additionalParams);

                if (!$emailSent) {
                    @ini_set('sendmail_from', $this->envelope_from);
                    $emailSent = @mail($to, $emailInfo['subject'], $emailInfo['body'], $emailInfo['headers']);
                }

                if ($emailSent) {
                    $this->markInvoiceAsSent($data->invoice_id, $user_data['user_id']);
                    echo json_encode(["message" => "Invoice email with attachment sent successfully", "data" => ["status" => 'sent']]);
                } else {
                    $this->log('error', 'mail() failed');
                    echo json_encode(["message" => "Invoice status updated, but server email failed", "email_error" => true]);
                }
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Server error", "error" => $e->getMessage()]);
        }
    }

    private function markInvoiceAsSent($invoice_id, $user_id)
    {
        $update = "UPDATE invoices SET status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END, updated_at = CURRENT_TIMESTAMP
                   WHERE id = :invoice_id AND user_id = :user_id AND status NOT IN ('paid', 'cancelled')";
        $stmt = $this->db->prepare($update);
        $stmt->bindParam(":invoice_id", $invoice_id);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->execute();
    }

    private function buildEmail($fromName, $fromEmail, $to, $subject, $textBody, $attachmentBytes, $attachmentName, $replyToEmail = null)
    {
        $encodedFromName = '=?UTF-8?B?' . base64_encode($fromName) . '?=';
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

        $headers = [
            'From: ' . $encodedFromName . ' <' . $fromEmail . '>',
            'Reply-To: ' . ($replyToEmail ?: $fromEmail),
            'MIME-Version: 1.0',
            'X-Mailer: PHP/' . phpversion()
        ];

        if ($attachmentBytes) {
            $boundary = 'PMS_' . md5(time());
            $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundary . '"';
            $body = "This is a multi-part message in MIME format.\r\n\r\n";
            $body .= '--' . $boundary . "\r\n";
            $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
            $body .= $textBody . "\r\n\r\n";
            $body .= '--' . $boundary . "\r\n";
            $body .= "Content-Type: application/pdf; name=\"" . $attachmentName . "\"\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n";
            $body .= "Content-Disposition: attachment; filename=\"" . $attachmentName . "\"\r\n\r\n";
            $body .= chunk_split(base64_encode($attachmentBytes), 76, "\r\n") . "\r\n";
            $body .= '--' . $boundary . '--';
        } else {
            $headers[] = 'Content-Type: text/plain; charset=UTF-8';
            $headers[] = 'Content-Transfer-Encoding: 8bit';
            $body = $textBody;
        }

        return [
            'headers' => implode("\r\n", $headers),
            'body' => $body,
            'subject' => $encodedSubject
        ];
    }

    private function log($level, $message)
    {
        if ($this->logFile) {
            $line = json_encode(['time' => date('c'), 'level' => $level, 'message' => $message]) . PHP_EOL;
            @file_put_contents($this->logFile, $line, FILE_APPEND);
        }
    }
}

$email_controller = new InvoiceEmailController();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email_controller->sendInvoiceEmail();
} else {
    http_response_code(405);
}
