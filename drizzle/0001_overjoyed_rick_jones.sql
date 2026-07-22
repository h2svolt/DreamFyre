CREATE TABLE IF NOT EXISTS `engagement_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action_key` text NOT NULL,
	`reward_type` text NOT NULL,
	`reward_amount` real DEFAULT 0 NOT NULL,
	`metadata` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `engagement_user_action_idx` ON `engagement_actions` (`user_id`,`action_key`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `game_favorites` (
	`user_id` text NOT NULL,
	`game_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `game_favorites_user_game_idx` ON `game_favorites` (`user_id`,`game_id`);
