ALTER TABLE `Orders` ADD `payment_method` text DEFAULT 'counter' NOT NULL;--> statement-breakpoint
ALTER TABLE `Orders` ADD `payment_status` text DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE `Orders` ADD `razorpay_order_id` text;--> statement-breakpoint
ALTER TABLE `Orders` ADD `razorpay_payment_id` text;--> statement-breakpoint
ALTER TABLE `Orders` ADD `cart_session_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_orders_razorpay_order_id` ON `Orders` (`razorpay_order_id`);