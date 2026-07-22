CREATE TABLE IF NOT EXISTS `game_account_metadata` (
	`account_id` text PRIMARY KEY NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	`launch_url` text,
	`balance_updated_at` text NOT NULL
);
