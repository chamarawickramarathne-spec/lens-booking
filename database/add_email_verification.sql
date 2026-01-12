-- Add email verification fields to photographers table
-- Run this migration to add active_status and verification_token fields

-- Add active_status column (0 = inactive/unverified, 1 = active/verified)
ALTER TABLE photographers 
ADD COLUMN IF NOT EXISTS active_status TINYINT(1) DEFAULT 0 AFTER profile_image;

-- Add verification_token column to store unique token for email verification
ALTER TABLE photographers 
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255) DEFAULT NULL AFTER active_status;

-- Add token_expires_at column to set expiration for verification tokens
ALTER TABLE photographers 
ADD COLUMN IF NOT EXISTS token_expires_at DATETIME DEFAULT NULL AFTER verification_token;

-- Update existing users to active status (backwards compatibility)
UPDATE photographers SET active_status = 1 WHERE active_status IS NULL OR active_status = 0;
