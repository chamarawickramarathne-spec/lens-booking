-- Add set_name column to gallery_images table
ALTER TABLE gallery_images ADD COLUMN set_name VARCHAR(255) DEFAULT 'Highlights';
