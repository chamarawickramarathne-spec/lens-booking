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

-- Note: The photographers table already has 'user_access_level' column
-- which stores the access_levels.id as an integer
-- No need to add a new column, just ensure existing data is valid
