-- Add missing fields to invoices table and update status ENUM
-- Run this migration to sync database with application requirements

-- Add deposit_amount and payment_date columns
ALTER TABLE invoices
ADD COLUMN deposit_amount DECIMAL(10,2) DEFAULT 0 AFTER total_amount,
ADD COLUMN payment_date DATE NULL AFTER notes;

-- Update status ENUM to match frontend expectations
ALTER TABLE invoices
MODIFY COLUMN status ENUM('draft', 'pending', 'sent', 'paid', 'overdue', 'cancelled', 'cancel_by_client') DEFAULT 'draft';
