<?php
/**
 * JWT Authentication Helper
 * Handles JWT token creation and validation
 */

class JWTAuth {
    private $secret_key = "lens_booking_pro_secret_2024";
    private $issuer = "lens-booking-pro";
    private $audience = "lens-booking-users";
    private $expiry_time = 86400; // 24 hours

    public function __construct() {
        $this->secret_key = $_ENV['JWT_SECRET'] ?? $this->secret_key;
    }

    /**
     * Generate JWT token
     */
    public function generateToken($user_data) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        
        $payload = json_encode([
            'iss' => $this->issuer,
            'aud' => $this->audience,
            'iat' => time(),
            'exp' => time() + $this->expiry_time,
            'data' => [
                'user_id' => $user_data['id'],
                'email' => $user_data['email'],
                'role' => $user_data['role']
            ]
        ]);

        $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, $this->secret_key, true);
        $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return $base64Header . "." . $base64Payload . "." . $base64Signature;
    }

    /**
     * Validate JWT token
     */
    public function validateToken($token) {
        if (!$token) {
            return false;
        }

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return false;
        }

        list($header, $payload, $signature) = $parts;

        // Verify signature
        $validSignature = str_replace(['+', '/', '='], ['-', '_', ''], 
            base64_encode(hash_hmac('sha256', $header . "." . $payload, $this->secret_key, true)));

        if ($signature !== $validSignature) {
            return false;
        }

        // Decode payload
        $payloadData = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);

        // Check expiration
        if ($payloadData['exp'] < time()) {
            return false;
        }

        return $payloadData['data'];
    }

    /**
     * Get user from token in Authorization header
     */
    public function getUserFromHeader() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;
        
        if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return false;
        }

        return $this->validateToken($matches[1]);
    }
}
?>