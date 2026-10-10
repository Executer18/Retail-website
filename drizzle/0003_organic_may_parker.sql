CREATE TABLE `cart_items` (
	`cart_item_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`product_id` integer NOT NULL,
	`quantity_kg` real NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `Products`(`product_id`) ON UPDATE no action ON DELETE cascade
);
