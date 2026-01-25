-- Add missing fields to payment_schedules table
-- Run this migration to support payment tracking

ALTER TABLE payment_schedules
ADD COLUMN paid_amount DECIMAL(10,2) DEFAULT 0 AFTER amount,
ADD COLUMN schedule_type VARCHAR(50) AFTER schedule_name;
