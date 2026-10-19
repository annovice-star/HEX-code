CREATE TABLE `inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`topic` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`message` text NOT NULL,
	`language` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `articles` ADD `guide` text;