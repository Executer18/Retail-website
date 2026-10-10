CREATE INDEX `idx_cart_items_session` ON `cart_items` (`session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_cart_items_session_product` ON `cart_items` (`session_id`,`product_id`);