-- Add payment_date column to invoices table if it doesn't exist
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_date DATE;