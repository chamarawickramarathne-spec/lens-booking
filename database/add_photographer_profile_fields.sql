-- Add profile fields to photographers table if they don't exist
-- Run this migration to add business_name, bio, website, and portfolio_url fields

-- Add business_name column
ALTER TABLE photographers 
ADD COLUMN IF NOT EXISTS business_name VARCHAR(255) DEFAULT NULL AFTER last_name;

-- Add bio column
ALTER TABLE photographers 
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL AFTER business_name;

-- Add website column
ALTER TABLE photographers 
ADD COLUMN IF NOT EXISTS website VARCHAR(500) DEFAULT NULL AFTER bio;

-- Add portfolio_url column
ALTER TABLE photographers 
ADD COLUMN IF NOT EXISTS portfolio_url VARCHAR(500) DEFAULT NULL AFTER website;

-- Add expire_date column for access level expiry tracking
ALTER TABLE photographers 
ADD COLUMN IF NOT EXISTS expire_date DATE DEFAULT NULL AFTER user_access_level_id;
