<?php
/**
 * Dashboard Controller
 * Handles dashboard data endpoints
 */

// Include CORS configuration first
require_once 'config/cors.php';

require_once 'config/database.php';
require_once 'config/cors.php';
require_once 'models/Booking.php';
require_once 'middleware/auth.php';

class DashboardController {
    private $database;
    private $db;
    private $booking;
    private $auth;

    public function __construct() {
        $this->database = new Database();
        $this->db = $this->database->getConnection();
        $this->booking = new Booking($this->db);
        $this->auth = new JWTAuth();
    }

    /**
     * Get dashboard statistics
     */
    public function getStats() {
        $user_data = $this->auth->getUserFromHeader();

        if (!$user_data) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied"]);
            return;
        }

        // Get booking statistics
        $booking_stats = $this->booking->getDashboardStats($user_data['user_id']);

        // Get recent bookings
        $recent_bookings = $this->booking->getByUserId($user_data['user_id']);
        $recent_bookings = array_slice($recent_bookings, 0, 5); // Get only 5 recent bookings

        // Get client count
        $client_query = "SELECT COUNT(*) as total_clients FROM clients WHERE user_id = :user_id";
        $client_stmt = $this->db->prepare($client_query);
        $client_stmt->bindParam(":user_id", $user_data['user_id']);
        $client_stmt->execute();
        $client_stats = $client_stmt->fetch(PDO::FETCH_ASSOC);

        // Get monthly revenue
        $monthly_revenue_query = "SELECT 
                                    MONTH(booking_date) as month,
                                    YEAR(booking_date) as year,
                                    SUM(total_amount) as revenue
                                  FROM bookings 
                                  WHERE user_id = :user_id 
                                    AND booking_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                                  GROUP BY YEAR(booking_date), MONTH(booking_date)
                                  ORDER BY year DESC, month DESC";
        
        $monthly_stmt = $this->db->prepare($monthly_revenue_query);
        $monthly_stmt->bindParam(":user_id", $user_data['user_id']);
        $monthly_stmt->execute();
        $monthly_revenue = $monthly_stmt->fetchAll(PDO::FETCH_ASSOC);

        http_response_code(200);
        echo json_encode([
            "message" => "Dashboard data retrieved successfully",
            "data" => [
                "booking_stats" => $booking_stats,
                "client_count" => $client_stats['total_clients'],
                "recent_bookings" => $recent_bookings,
                "monthly_revenue" => $monthly_revenue
            ]
        ]);
    }
}

// Handle request
$dashboard_controller = new DashboardController();
$request_method = $_SERVER["REQUEST_METHOD"];

if ($request_method === 'GET') {
    $dashboard_controller->getStats();
} else {
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed"]);
}
?>