CREATE TABLE `database_properties` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`options` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `database_properties_page_id_idx` ON `database_properties` (`page_id`);--> statement-breakpoint
CREATE TABLE `database_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`database_page_id` text NOT NULL,
	`values` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`database_page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `database_rows_database_page_id_idx` ON `database_rows` (`database_page_id`);--> statement-breakpoint
ALTER TABLE `pages` ADD `page_type` text DEFAULT 'document' NOT NULL;