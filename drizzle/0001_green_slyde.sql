CREATE TABLE `Product_Images` (
	`image_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`image_url` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `Products`(`product_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_product_images_product_id` ON `Product_Images` (`product_id`);--> statement-breakpoint
ALTER TABLE `Products` ADD `description` text;--> statement-breakpoint
ALTER TABLE `Products` ADD `ingredients` text;