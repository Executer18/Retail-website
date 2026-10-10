PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_Customers` (
	`customer_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`phone_number` text,
	`auth_user_id` text
);
--> statement-breakpoint
INSERT INTO `__new_Customers`("customer_id", "full_name", "phone_number", "auth_user_id") SELECT "customer_id", "full_name", "phone_number", "auth_user_id" FROM `Customers`;--> statement-breakpoint
DROP TABLE `Customers`;--> statement-breakpoint
ALTER TABLE `__new_Customers` RENAME TO `Customers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `Customers_auth_user_id_unique` ON `Customers` (`auth_user_id`);--> statement-breakpoint
CREATE INDEX `idx_customers_phone` ON `Customers` (`phone_number`);--> statement-breakpoint
ALTER TABLE `Orders` ADD `customer_name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `Orders` ADD `customer_phone` text NOT NULL;