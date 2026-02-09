ALTER TABLE `backtest_sessions` ADD `totalAssets` decimal(16,2);--> statement-breakpoint
ALTER TABLE `backtest_sessions` ADD `totalPnL` decimal(16,2);--> statement-breakpoint
ALTER TABLE `backtest_sessions` ADD `totalPnLPercent` decimal(10,4);