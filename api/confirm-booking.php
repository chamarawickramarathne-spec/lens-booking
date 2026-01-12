<?php
/**
 * Booking Confirmation Endpoint
 * Public endpoint to confirm a booking via secure token
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/cors.php';

setCORSHeaders();
handleCORSPreflight();

class BookingConfirmation {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    /**
     * Verify and confirm a booking using the token
     */
    public function confirmBooking() {
        // Get token from query string
        $token = $_GET['token'] ?? null;
        
        if (!$token) {
            http_response_code(400);
            echo json_encode(['message' => 'Confirmation token is required']);
            return;
        }
        
        try {
            // Find booking by token
            $query = "SELECT b.id, b.photographer_id, b.client_id, b.status, b.total_amount, b.deposit_amount,
                             c.name as client_name, c.email as client_email,
                             b.confirmation_token, b.confirmation_token_expires
                      FROM bookings b
                      LEFT JOIN clients c ON b.client_id = c.id
                      WHERE b.confirmation_token = :token";
            
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':token', $token);
            $stmt->execute();
            
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$booking) {
                http_response_code(404);
                echo json_encode(['message' => 'Invalid confirmation link']);
                return;
            }
            
            // Check if token has expired
            if (strtotime($booking['confirmation_token_expires']) < time()) {
                http_response_code(400);
                echo json_encode(['message' => 'Confirmation link has expired']);
                return;
            }
            
            // Check if already confirmed
            if ($booking['status'] === 'confirmed') {
                http_response_code(200);
                echo json_encode([
                    'message' => 'Booking already confirmed',
                    'booking_id' => $booking['id']
                ]);
                return;
            }
            
            // Update booking status to confirmed
            $updateQuery = "UPDATE bookings 
                           SET status = 'confirmed', 
                               confirmation_token = NULL,
                               confirmation_token_expires = NULL,
                               updated_at = CURRENT_TIMESTAMP
                           WHERE id = :id";
            
            $updateStmt = $this->db->prepare($updateQuery);
            $updateStmt->bindParam(':id', $booking['id']);
            $updateStmt->execute();
            
            // Create invoice for the confirmed booking
            $this->createInvoiceForBooking($booking);
            
            http_response_code(200);
            echo json_encode([
                'message' => 'Booking confirmed successfully',
                'booking_id' => $booking['id']
            ]);
            
        } catch (Exception $e) {
            error_log('[confirm-booking] Error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Failed to confirm booking']);
        }
    }
    
    /**
     * Create an invoice for the confirmed booking
     */
    private function createInvoiceForBooking($booking) {
        try {
            // Check if invoice already exists
            $checkQuery = "SELECT id FROM invoices WHERE booking_id = :booking_id LIMIT 1";
            $checkStmt = $this->db->prepare($checkQuery);
            $checkStmt->bindParam(':booking_id', $booking['id']);
            $checkStmt->execute();
            
            if ($checkStmt->rowCount() > 0) {
                return; // Invoice already exists
            }
            
            // Generate invoice number
            $invoice_number = 'INV-' . date('Ymd') . '-' . str_pad($booking['id'], 4, '0', STR_PAD_LEFT);
            
            // Create invoice
            $invoiceQuery = "INSERT INTO invoices 
                            SET photographer_id = :photographer_id, 
                                client_id = :client_id, 
                                booking_id = :booking_id,
                                invoice_number = :invoice_number, 
                                issue_date = :issue_date, 
                                due_date = :due_date,
                                subtotal = :subtotal, 
                                tax_amount = 0, 
                                total_amount = :total_amount,
                                deposit_amount = :deposit_amount, 
                                status = 'draft',
                                created_at = CURRENT_TIMESTAMP,
                                updated_at = CURRENT_TIMESTAMP";
            
            $invoiceStmt = $this->db->prepare($invoiceQuery);
            
            $issue_date = date('Y-m-d');
            $due_date = date('Y-m-d', strtotime('+30 days'));
            $total_amount = $booking['total_amount'] ?? 0;
            $deposit_amount = $booking['deposit_amount'] ?? 0;
            
            $invoiceStmt->bindParam(':photographer_id', $booking['photographer_id']);
            $invoiceStmt->bindParam(':client_id', $booking['client_id']);
            $invoiceStmt->bindParam(':booking_id', $booking['id']);
            $invoiceStmt->bindParam(':invoice_number', $invoice_number);
            $invoiceStmt->bindParam(':issue_date', $issue_date);
            $invoiceStmt->bindParam(':due_date', $due_date);
            $invoiceStmt->bindParam(':subtotal', $total_amount);
            $invoiceStmt->bindParam(':total_amount', $total_amount);
            $invoiceStmt->bindParam(':deposit_amount', $deposit_amount);
            
            $invoiceStmt->execute();
            
            error_log('[confirm-booking] Invoice created for booking ' . $booking['id']);
            
        } catch (Exception $e) {
            error_log('[confirm-booking] Failed to create invoice: ' . $e->getMessage());
            // Don't throw - confirmation should succeed even if invoice creation fails
        }
    }
}

// Handle the request
$confirmation = new BookingConfirmation();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $confirmation->confirmBooking();
} else {
    http_response_code(405);
    echo json_encode(['message' => 'Method not allowed']);
}
