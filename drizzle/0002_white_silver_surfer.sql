CREATE TABLE `tracked_people` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`nameZh` varchar(128),
	`title` varchar(256),
	`titleZh` varchar(256),
	`twitterHandle` varchar(64),
	`truthSocialHandle` varchar(64),
	`category` enum('政治','科技','金融','商业','其他') NOT NULL DEFAULT '其他',
	`avatarEmoji` varchar(10) DEFAULT '👤',
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tracked_people_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tracked_people` ADD CONSTRAINT `tracked_people_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;