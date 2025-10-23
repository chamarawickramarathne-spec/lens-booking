-- Add business_name column to photographers table
USE lens_booking_pro;

ALTER TABLE photographers 
ADD COLUMN business_name VARCHAR(255) DEFAULT NULL AFTER last_name;
