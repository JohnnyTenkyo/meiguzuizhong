CREATE TABLE `backtest_positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`avgCost` decimal(16,4) NOT NULL,
	`totalCost` decimal(16,2) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `backtest_positions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backtest_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`localUserId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`initialBalance` decimal(16,2) NOT NULL,
	`currentBalance` decimal(16,2) NOT NULL,
	`startDate` bigint NOT NULL,
	`currentDate` bigint NOT NULL,
	`currentInterval` varchar(10) DEFAULT '1d',
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `backtest_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backtest_trades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`type` enum('buy','sell') NOT NULL,
	`quantity` int NOT NULL,
	`price` decimal(16,4) NOT NULL,
	`amount` decimal(16,2) NOT NULL,
	`tradeDate` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backtest_trades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `local_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(64) NOT NULL,
	`passwordHash` varchar(256) NOT NULL,
	`name` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `local_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `local_users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `watchlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `watchlist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `backtest_positions` ADD CONSTRAINT `backtest_positions_sessionId_backtest_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `backtest_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `backtest_sessions` ADD CONSTRAINT `backtest_sessions_localUserId_local_users_id_fk` FOREIGN KEY (`localUserId`) REFERENCES `local_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `backtest_trades` ADD CONSTRAINT `backtest_trades_sessionId_backtest_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `backtest_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `watchlist` ADD CONSTRAINT `watchlist_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;