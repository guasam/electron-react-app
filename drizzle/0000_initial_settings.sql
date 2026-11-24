CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`generation` text NOT NULL,
	`value` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	CONSTRAINT "settings_key_format" CHECK(length("settings"."key") BETWEEN 1 AND 100 AND "settings"."key" NOT GLOB '*[^A-Za-z0-9._-]*' AND substr("settings"."key", 1, 1) GLOB '[A-Za-z0-9]'),
	CONSTRAINT "settings_value_length" CHECK(length("settings"."value") <= 5000),
	CONSTRAINT "settings_version_positive" CHECK("settings"."version" > 0)
);
