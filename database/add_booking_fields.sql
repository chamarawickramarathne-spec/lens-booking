-- Add new fields to bookings table
USE lens_booking_pro;

ALTER TABLE bookings 
ADD COLUMN package_type VARCHAR(50) DEFAULT 'Birthday' AFTER location,
ADD COLUMN package_name VARCHAR(255) DEFAULT NULL AFTER package_type,
ADD COLUMN pre_shoot VARCHAR(50) DEFAULT 'Photography' AFTER package_name,
ADD COLUMN album VARCHAR(10) DEFAULT 'No' AFTER pre_shoot;
