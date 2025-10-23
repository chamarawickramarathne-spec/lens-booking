-- Update bookings table status enum to include new status
USE lens_booking_pro;

-- Modify the status enum to include 'shoot_completed'
ALTER TABLE bookings 
MODIFY COLUMN status ENUM('pending', 'confirmed', 'shoot_completed', 'completed', 'cancelled', 'cancel_by_client') DEFAULT 'pending';
