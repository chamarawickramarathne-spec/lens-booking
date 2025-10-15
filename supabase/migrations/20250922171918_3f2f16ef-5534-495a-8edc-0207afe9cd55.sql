-- Fix the foreign key constraint error and add proper constraints

-- 1. Fix the invoices foreign key (it should reference clients, not invoices)
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_client 
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- 2. Add other foreign key constraints properly  
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_client 
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE invoices ADD CONSTRAINT fk_invoices_booking 
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

ALTER TABLE galleries ADD CONSTRAINT fk_galleries_client 
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE galleries ADD CONSTRAINT fk_galleries_booking 
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

ALTER TABLE gallery_images ADD CONSTRAINT fk_gallery_images_gallery 
  FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE;

ALTER TABLE payment_schedules ADD CONSTRAINT fk_payment_schedules_booking 
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

ALTER TABLE payment_schedules ADD CONSTRAINT fk_payment_schedules_invoice 
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;