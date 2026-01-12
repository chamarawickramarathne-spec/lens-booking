-- Add confirmation token fields to bookings table
ALTER TABLE bookings 
ADD COLUMN confirmation_token VARCHAR(64) NULL,
ADD COLUMN confirmation_token_expires DATETIME NULL,
ADD INDEX idx_confirmation_token (confirmation_token);
