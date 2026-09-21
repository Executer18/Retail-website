CREATE TABLE `Customers` (
	`customer_id` integer PRIMARY KEY AUTOINCREMENT,
	`full_name` text NOT NULL,
	`phone_number` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Order_Items` (
	`item_id` integer PRIMARY KEY AUTOINCREMENT,
	`order_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`price_per_kg_at_purchase` real NOT NULL,
	`weight_kg` real NOT NULL,
	CONSTRAINT `fk_Order_Items_order_id_Orders_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `Orders`(`order_id`) ON DELETE CASCADE,
	CONSTRAINT `fk_Order_Items_product_id_Products_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `Products`(`product_id`)
);
--> statement-breakpoint
CREATE TABLE `Orders` (
	`order_id` integer PRIMARY KEY AUTOINCREMENT,
	`customer_id` integer NOT NULL,
	`order_date` text DEFAULT CURRENT_TIMESTAMP,
	`pickup_slot` text NOT NULL,
	`status` text DEFAULT 'Reserved' NOT NULL,
	`total_amount` real NOT NULL,
	CONSTRAINT `fk_Orders_customer_id_Customers_customer_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `Customers`(`customer_id`)
);
--> statement-breakpoint
CREATE TABLE `Products` (
	`product_id` integer PRIMARY KEY AUTOINCREMENT,
	`item_name` text NOT NULL,
	`category` text NOT NULL,
	`price_per_kg` real NOT NULL,
	`in_stock_kg` real DEFAULT 0 NOT NULL,
	`image_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_customers_phone` ON `Customers` (`phone_number`);--> statement-breakpoint
CREATE INDEX `idx_order_items_order_id` ON `Order_Items` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_order_items_product_id` ON `Order_Items` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_status` ON `Orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_orders_customer_id` ON `Orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_products_category` ON `Products` (`category`);