CREATE TABLE `payment_method_links` (
	`method_id` text PRIMARY KEY NOT NULL,
	`payment_url` text,
	`updated_by` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `support_channel_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`channel_type` text NOT NULL,
	`destination` text,
	`enabled` integer DEFAULT false NOT NULL,
	`updated_by` text,
	`updated_at` text NOT NULL
);
