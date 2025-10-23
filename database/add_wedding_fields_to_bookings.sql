-- Migration: Add wedding-specific fields to bookings table
-- Safe for re-run with IF NOT EXISTS checks where supported

ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS wedding_hotel_name VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS wedding_date DATE NULL,
    ADD COLUMN IF NOT EXISTS homecoming_hotel_name VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS homecoming_date DATE NULL,
    ADD COLUMN IF NOT EXISTS wedding_album TINYINT(1) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pre_shoot_album TINYINT(1) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS family_album TINYINT(1) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS group_photo_size VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS homecoming_photo_size VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS wedding_photo_sizes TEXT NULL,
    ADD COLUMN IF NOT EXISTS extra_thank_you_cards_qty INT DEFAULT 0;

-- If your MySQL version does not support IF NOT EXISTS on ADD COLUMN,
-- re-run manually or use conditional checks.
