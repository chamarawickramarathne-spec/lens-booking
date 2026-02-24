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
        $this->from_email = 'noreply@lensmanager.hireartist.studio';
        $this->from_name = 'Lens Manager';
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

        // For production (app is hosted under)
        if (strpos($host, 'lensmanager.hireartist.studio') !== false) {
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

        $subject = 'Verify Your Email - Lens Manager';

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
        return '
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #4A5568;
        }
        .content {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        h1 {
            color: #2D3748;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .verify-button {
            display: inline-block;
            padding: 15px 30px;
            background-color: #4299E1;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .verify-button:hover {
            background-color: #3182CE;
        }
        .footer {
            text-align: center;
            color: #718096;
            font-size: 14px;
            margin-top: 20px;
        }
        .warning {
            background-color: #FFF5E6;
            border-left: 4px solid #F6AD55;
            padding: 15px;
            margin: 20px 0;
        }
        .link-text {
            word-break: break-all;
            color: #4299E1;
            font-size: 12px;
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">📸 Lens Manager</div>
        </div>
        
        <div class="content">
            <h1>Welcome to Lens Manager!</h1>
            
            <p>Hello ' . htmlspecialchars($name) . ',</p>
            
            <p>Thank you for signing up! To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
                <a href="' . htmlspecialchars($verification_link) . '" class="verify-button">Verify Email Address</a>
            </div>
            
            <div class="warning">
                <strong>⏰ Important:</strong> This verification link will expire in 24 hours.
            </div>
            
            <p>If the button doesn\'t work, you can copy and paste this link into your browser:</p>
            <p class="link-text">' . htmlspecialchars($verification_link) . '</p>
            
            <p>If you didn\'t create an account with Lens Manager, you can safely ignore this email.</p>
        </div>
        
        <div class="footer">
            <p>© ' . date('Y') . ' Lens Manager. All rights reserved.</p>
            <p>This is an automated email. Please do not reply to this message.</p>
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

        $subject = 'Welcome to Lens Manager!';

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
        return '
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Lens Manager</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #4A5568;
        }
        .content {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
        }
        h1 {
            color: #2D3748;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .login-button {
            display: inline-block;
            padding: 15px 30px;
            background-color: #48BB78;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            color: #718096;
            font-size: 14px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">📸 Lens Manager</div>
        </div>
        
        <div class="content">
            <h1>Welcome Aboard! 🎉</h1>
            
            <p>Hello ' . htmlspecialchars($name) . ',</p>
            
            <p>Your email has been successfully verified! You can now access all features of Lens Manager.</p>
            
            <div style="text-align: center;">
                <a href="' . htmlspecialchars($login_link) . '" class="login-button">Login Now</a>
            </div>
            
            <p>Start managing your photography bookings, clients, invoices, and galleries with ease!</p>
        </div>
        
        <div class="footer">
            <p>© ' . date('Y') . ' Lens Manager. All rights reserved.</p>
        </div>
    </div>
</body>
</html>';
    }
}
?>