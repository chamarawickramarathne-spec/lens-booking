-- Create payment_installments table for recording installment payments

CREATE TABLE IF NOT EXISTS `payment_installments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `payment_schedule_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `paid_date` date DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `payment_schedule_id` (`payment_schedule_id`),
  CONSTRAINT `payment_installments_ibfk_1` FOREIGN KEY (`payment_schedule_id`) REFERENCES `payment_schedules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_installments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
