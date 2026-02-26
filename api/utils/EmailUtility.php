<?php
/**
 * Email Utility
 * Handles sending emails for verification and notifications
 */

class EmailUtility
{
    private $from_email;
    private $from_name;
    private $base_url;
    private $envelope_from;
    private $dev_mode;
    private $email_log_file;

    public function __construct()
    {
        // Set default values - these can be overridden
        $this->from_email = 'noreply@hireartist.studio';
        $this->from_name = 'Hire Artist';
        $this->base_url = $this->getBaseUrl();
        $this->envelope_from = $this->from_email; // used with -f to improve deliverability

        // Detect environment
        $isLocal = (
            isset($_SERVER['HTTP_HOST']) && (
                $_SERVER['HTTP_HOST'] === 'localhost' ||
                $_SERVER['SERVER_NAME'] === 'localhost' ||
                $_SERVER['SERVER_ADDR'] === '127.0.0.1'
            )
        );
        $this->dev_mode = $isLocal;
        $this->email_log_file = __DIR__ . '/../../logs/email.log';
    }

    /**
     * Get base URL for the application
     */
    private function getBaseUrl()
    {
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';

        // For production
        if (strpos($host, 'hireartist.studio') !== false) {
            return 'https://lensmanager.hireartist.studio';
        }

        // For local development
        // No trailing slash to avoid double '//' when concatenating paths
        return $protocol . '://' . $host;
    }

    /**
     * Send verification email
     */
    public function sendVerificationEmail($to_email, $to_name, $verification_token)
    {
        // Add redirect=1 so API shows a friendly page and auto-redirects to app after success
        // Include next to explicitly send users to the SPA landing
        $verification_link = $this->base_url . '/api/auth/verify-email?token=' . $verification_token;

        $subject = 'Activate Your PhotoStudio Manager Account';

        $message = $this->getVerificationEmailTemplate($to_name, $verification_link);
        $headersArray = $this->getEmailHeadersArray();
        $sent = $this->sendMail($to_email, $subject, $message, $headersArray);

        if ($sent) {
            error_log("Verification email sent to: $to_email");
            return true;
        } else {
            error_log("Failed to send verification email to: $to_email");
            return false;
        }
    }

    /**
     * Get email headers
     */
    private function getEmailHeadersArray()
    {
        $headers = [];
        $headers[] = 'MIME-Version: 1.0';
        $headers[] = 'Content-type: text/html; charset=UTF-8';
        $headers[] = 'From: ' . $this->from_name . ' <' . $this->from_email . '>';
        $headers[] = 'Reply-To: ' . $this->from_email;
        // Return-Path header is often ignored by MTAs; envelope sender (-f) is preferred,
        // but we include it for completeness
        $headers[] = 'Return-Path: ' . $this->from_email;
        $headers[] = 'X-Mailer: PHP/' . phpversion();

        return $headers;
    }

    /**
     * Low-level mail sender with envelope sender (-f) for better deliverability
     */
    private function sendMail($to, $subject, $message, array $headersArray)
    {
        $headers = implode("\r\n", $headersArray);

        // Development mode: log email instead of sending
        if ($this->dev_mode) {
            $this->logEmail($to, $subject, $message, $headers);
            error_log('[EmailUtility] DEV MODE: Email logged instead of sent. To=' . $to . ', Subject=' . $subject);
            return true;
        }

        // Use envelope sender if possible (many hosts require this)
        $additionalParams = '-f ' . escapeshellarg($this->envelope_from);

        // Attempt 1: with -f envelope sender
        $sent = @mail($to, $subject, $message, $headers, $additionalParams);
        if ($sent) {
            return true;
        }

        // Attempt 2: set sendmail_from (Windows / some hosts)
        @ini_set('sendmail_from', $this->from_email);
        $sent2 = @mail($to, $subject, $message, $headers);
        if ($sent2) {
            return true;
        }

        // Log detailed failure context without leaking message content
        error_log('[EmailUtility] mail() failed. To=' . $to . ', Subject=' . $subject . ', From=' . $this->from_email);
        return false;
    }

    /**
     * Log email to file in development mode
     */
    private function logEmail($to, $subject, $message, $headers)
    {
        $logDir = dirname($this->email_log_file);
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }

        $logEntry = "\n" . str_repeat('=', 80) . "\n";
        $logEntry .= "[" . date('Y-m-d H:i:s') . "] EMAIL LOGGED (DEV MODE)\n";
        $logEntry .= str_repeat('-', 80) . "\n";
        $logEntry .= "To: " . $to . "\n";
        $logEntry .= "Subject: " . $subject . "\n";
        $logEntry .= "Headers:\n" . $headers . "\n";
        $logEntry .= str_repeat('-', 80) . "\n";
        $logEntry .= "Message:\n" . $message . "\n";
        $logEntry .= str_repeat('=', 80) . "\n";

        @file_put_contents($this->email_log_file, $logEntry, FILE_APPEND);
    }

    /**
     * Get verification email HTML template
     */
    private function getVerificationEmailTemplate($name, $verification_link)
    {
        $logo_url = 'https://lensmanager.hireartist.studio/hireartist_logo_dim.png';
        
        return '
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc; }
        .wrapper { padding: 40px 20px; }
        .container { background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { height: 60px; width: auto; }
        .welcome-text { color: #1e293b; font-size: 24px; font-weight: 700; margin-bottom: 12px; text-align: center; }
        .body-text { color: #64748b; font-size: 16px; margin-bottom: 24px; }
        .button-container { text-align: center; margin: 35px 0; }
        .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #e94560 0%, #533483 100%); color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); transition: transform 0.2s; }
        .warning { background-color: #fefce8; border-left: 4px solid #eab308; padding: 16px; border-radius: 8px; margin-bottom: 24px; color: #854d0e; font-size: 14px; }
        .footer { text-align: center; color: #94a3b8; font-size: 13px; margin-top: 30px; }
        .link-alt { word-break: break-all; color: #6366f1; font-size: 12px; margin-top: 20px; text-decoration: none; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <img src="' . $logo_url . '" alt="Hire Artist Logo" class="logo">
            </div>
            
            <h1 class="welcome-text">Activate Your Account</h1>
            
            <p class="body-text">Hello ' . htmlspecialchars($name) . ',</p>
            
            <p class="body-text">Thank you for joining <strong>PhotoStudio Manager</strong>. We\'re excited to help you manage your photography business more efficiently. To get started, please verify your email address.</p>
            
            <div class="button-container">
                <a href="' . htmlspecialchars($verification_link) . '" class="btn">Verify Email Address</a>
            </div>
            
            <div class="warning">
                <strong>Important:</strong> This link will expire in 24 hours. If you did not create this account, you can safely ignore this email.
            </div>
            
            <p class="body-text" style="font-size: 14px;">If the button above doesn\'t work, copy and paste this link into your browser:</p>
            <a href="' . htmlspecialchars($verification_link) . '" class="link-alt">' . htmlspecialchars($verification_link) . '</a>
        </div>
        
        <div class="footer">
            <p>© ' . date('Y') . ' Hire Artist. All rights reserved.</p>
            <p>PhotoStudio Manager by Hire Artist</p>
        </div>
    </div>
</body>
</html>';
    }

    /**
     * Send welcome email after verification
     */
    public function sendWelcomeEmail($to_email, $to_name)
    {
        $login_link = $this->base_url . '/login';

        $subject = 'Welcome to PhotoStudio Manager!';

        $message = $this->getWelcomeEmailTemplate($to_name, $login_link);

        $headersArray = $this->getEmailHeadersArray();

        $sent = $this->sendMail($to_email, $subject, $message, $headersArray);

        if ($sent) {
            error_log("Welcome email sent to: $to_email");
            return true;
        } else {
            error_log("Failed to send Welcome email to: $to_email");
            return false;
        }
    }

    /**
     * Get welcome email HTML template
     */
    private function getWelcomeEmailTemplate($name, $login_link)
    {
        $logo_url = 'https://lensmanager.hireartist.studio/hireartist_logo_dim.png';
        
        return '
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc; }
        .wrapper { padding: 40px 20px; }
        .container { background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { height: 60px; width: auto; }
        .welcome-text { color: #1e293b; font-size: 24px; font-weight: 700; margin-bottom: 12px; text-align: center; }
        .body-text { color: #64748b; font-size: 16px; margin-bottom: 24px; }
        .button-container { text-align: center; margin: 35px 0; }
        .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #48bb78 0%, #2f855a 100%); color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .footer { text-align: center; color: #94a3b8; font-size: 13px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <img src="' . $logo_url . '" alt="Hire Artist Logo" class="logo">
            </div>
            
            <h1 class="welcome-text">Account Verified! 🎉</h1>
            
            <p class="body-text">Hello ' . htmlspecialchars($name) . ',</p>
            
            <p class="body-text">Your email has been successfully verified! You can now start using <strong>PhotoStudio Manager</strong> to manage your photography business.</p>
            
            <div class="button-container">
                <a href="' . htmlspecialchars($login_link) . '" class="btn">Login to Dashboard</a>
            </div>
            
            <p class="body-text">We\'re thrilled to have you on board. Start creating bookings, managing clients, and sending invoices with ease!</p>
        </div>
        
        <div class="footer">
            <p>© ' . date('Y') . ' Hire Artist. All rights reserved.</p>
            <p>PhotoStudio Manager by Hire Artist</p>
        </div>
    </div>
</body>
</html>';
    }
}
?>