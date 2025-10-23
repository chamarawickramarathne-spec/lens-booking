-- Create access_levels table
CREATE TABLE IF NOT EXISTS access_levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level_name VARCHAR(50) NOT NULL UNIQUE,
    max_clients INT NULL COMMENT 'NULL means unlimited',
    max_bookings INT NULL COMMENT 'NULL means unlimited',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default access levels
INSERT INTO access_levels (level_name, max_clients, max_bookings) VALUES
('Free', 1, 1),
('Pro', 5, 10),
('Premium', 15, 30),
('Unlimited', NULL, NULL);

-- Add user_access_level_id column to photographers table
ALTER TABLE photographers
ADD COLUMN user_access_level_id INT DEFAULT 1 AFTER role,
ADD CONSTRAINT fk_users_access_level 
FOREIGN KEY (user_access_level_id) REFERENCES access_levels(id);

-- Set default access level for existing photographers (Free)
UPDATE photographers SET user_access_level_id = 1 WHERE user_access_level_id IS NULL;
