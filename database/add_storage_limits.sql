-- Add max_storage_gb column to access_levels table
ALTER TABLE access_levels ADD COLUMN max_storage_gb INT DEFAULT 5 COMMENT 'Limit in GB' AFTER max_bookings;

-- Update storage limits for existing tiers
UPDATE access_levels SET max_storage_gb = 5 WHERE level_name = 'Free';
UPDATE access_levels SET max_storage_gb = 10 WHERE level_name = 'Pro';
UPDATE access_levels SET max_storage_gb = 20 WHERE level_name = 'Premium';
UPDATE access_levels SET max_storage_gb = 50 WHERE level_name = 'Unlimited';
