-- Add package_price and discount_percentage columns to access_levels table
ALTER TABLE access_levels
    ADD COLUMN IF NOT EXISTS package_price DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Package monthly price in LKR',
    ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Discount percentage (e.g. 10 = 10%)';

-- Update default values
UPDATE access_levels SET package_price = 0.00, discount_percentage = 0.00 WHERE package_price IS NULL OR discount_percentage IS NULL;
