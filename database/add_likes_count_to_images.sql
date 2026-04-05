-- Add likes_count column to gallery_images table
ALTER TABLE gallery_images ADD COLUMN likes_count INT DEFAULT 0;
