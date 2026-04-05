-- Add settings columns to galleries table
ALTER TABLE galleries ADD COLUMN favorites_enabled BOOLEAN DEFAULT true;
ALTER TABLE galleries ADD COLUMN share_enabled BOOLEAN DEFAULT true;
