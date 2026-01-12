-- Migration: Fix user_access_level to properly link with access_levels table
-- This ensures user_access_level column stores integer IDs that reference access_levels.id
-- Default value should be 1 (Free tier)

-- Step 1: Update column type if needed (ensure it's INT)
ALTER TABLE photographers 
MODIFY COLUMN user_access_level INT DEFAULT 1;

-- Step 2: Update any existing text values to proper IDs
-- Map common text values to access_levels IDs
UPDATE photographers 
SET user_access_level = 1 
WHERE user_access_level = 0 OR user_access_level IS NULL;

UPDATE photographers 
SET user_access_level = CASE 
    WHEN LOWER(CAST(user_access_level AS CHAR)) = 'free' THEN 1
    WHEN LOWER(CAST(user_access_level AS CHAR)) = 'pro' THEN 2
    WHEN LOWER(CAST(user_access_level AS CHAR)) = 'premium' THEN 3
    WHEN LOWER(CAST(user_access_level AS CHAR)) = 'unlimited' THEN 4
    ELSE user_access_level
END
WHERE user_access_level IN ('free', 'Free', 'pro', 'Pro', 'premium', 'Premium', 'unlimited', 'Unlimited');

-- Step 3: Add foreign key constraint (if not exists)
-- This ensures referential integrity between photographers.user_access_level and access_levels.id
-- Note: This will fail if access_levels table doesn't exist or has no records

-- Check if constraint exists first, if not add it
SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'photographers' 
    AND CONSTRAINT_NAME = 'fk_photographers_access_level'
);

-- Only create if it doesn't exist
SET @sql = IF(@constraint_exists = 0,
    'ALTER TABLE photographers 
     ADD CONSTRAINT fk_photographers_access_level 
     FOREIGN KEY (user_access_level) REFERENCES access_levels(id) 
     ON DELETE SET NULL 
     ON UPDATE CASCADE',
    'SELECT "Foreign key already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Verify the changes
SELECT 'Migration complete. Verifying data...' as status;

-- Show current access level distribution
SELECT 
    al.id,
    al.level_name,
    COUNT(p.id) as user_count
FROM access_levels al
LEFT JOIN photographers p ON p.user_access_level = al.id
GROUP BY al.id, al.level_name
ORDER BY al.id;

-- Show any photographers with invalid access levels (should be 0 after migration)
SELECT COUNT(*) as invalid_access_levels
FROM photographers p
LEFT JOIN access_levels al ON p.user_access_level = al.id
WHERE al.id IS NULL;
