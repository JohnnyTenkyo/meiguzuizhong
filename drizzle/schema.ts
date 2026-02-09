import { bigint, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Local users table for username/password authentication
 */
export const localUsers = mysqlTable("local_users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 256 }).notNull(),
  name: varchar("name", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type LocalUser = typeof localUsers.$inferSelect;
export type InsertLocalUser = typeof localUsers.$inferInsert;

/**
 * Watchlist table for storing user's favorite stocks
 */
export const watchlist = mysqlTable("watchlist", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type Watchlist = typeof watchlist.$inferSelect;
export type InsertWatchlist = typeof watchlist.$inferInsert;

/**
 * Backtest sessions - each session is a "save file" for the backtest system
 */
export const backtestSessions = mysqlTable("backtest_sessions", {
  id: int("id").autoincrement().primaryKey(),
  localUserId: int("localUserId").notNull().references(() => localUsers.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 128 }).notNull(),
  initialBalance: decimal("initialBalance", { precision: 16, scale: 2 }).notNull(),
  currentBalance: decimal("currentBalance", { precision: 16, scale: 2 }).notNull(),
  /** Total assets (cash + position market value) */
  totalAssets: decimal("totalAssets", { precision: 16, scale: 2 }),
  /** Total profit/loss amount */
  totalPnL: decimal("totalPnL", { precision: 16, scale: 2 }),
  /** Total profit/loss percentage */
  totalPnLPercent: decimal("totalPnLPercent", { precision: 10, scale: 4 }),
  /** The simulation start date (YYYYMMDD as bigint for easy comparison) */
  startDate: bigint("startDate", { mode: "number" }).notNull(),
  /** The current simulation date the user has advanced to */
  currentDate: bigint("currentDate", { mode: "number" }).notNull(),
  /** Current time interval being viewed */
  currentInterval: varchar("currentInterval", { length: 10 }).default("1d"),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BacktestSession = typeof backtestSessions.$inferSelect;
export type InsertBacktestSession = typeof backtestSessions.$inferInsert;

/**
 * Backtest trades - buy/sell records within a session
 */
export const backtestTrades = mysqlTable("backtest_trades", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => backtestSessions.id, { onDelete: "cascade" }),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  type: mysqlEnum("type", ["buy", "sell"]).notNull(),
  quantity: int("quantity").notNull(),
  price: decimal("price", { precision: 16, scale: 4 }).notNull(),
  /** Total amount = quantity * price */
  amount: decimal("amount", { precision: 16, scale: 2 }).notNull(),
  /** The simulation date when this trade happened */
  tradeDate: bigint("tradeDate", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BacktestTrade = typeof backtestTrades.$inferSelect;
export type InsertBacktestTrade = typeof backtestTrades.$inferInsert;

/**
 * Backtest positions - current holdings in a session
 */
export const backtestPositions = mysqlTable("backtest_positions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => backtestSessions.id, { onDelete: "cascade" }),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  quantity: int("quantity").notNull().default(0),
  /** Average cost per share */
  avgCost: decimal("avgCost", { precision: 16, scale: 4 }).notNull(),
  /** Total invested amount */
  totalCost: decimal("totalCost", { precision: 16, scale: 2 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BacktestPosition = typeof backtestPositions.$inferSelect;
export type InsertBacktestPosition = typeof backtestPositions.$inferInsert;

/**
 * Custom tracked people - users can add their own people to track
 */
export const trackedPeople = mysqlTable("tracked_people", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 128 }).notNull(),
  nameZh: varchar("nameZh", { length: 128 }),
  title: varchar("title", { length: 256 }),
  titleZh: varchar("titleZh", { length: 256 }),
  twitterHandle: varchar("twitterHandle", { length: 64 }),
  truthSocialHandle: varchar("truthSocialHandle", { length: 64 }),
  category: mysqlEnum("category", ["政治", "科技", "金融", "商业", "其他"]).default("其他").notNull(),
  avatarEmoji: varchar("avatarEmoji", { length: 10 }).default("👤"),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrackedPerson = typeof trackedPeople.$inferSelect;
export type InsertTrackedPerson = typeof trackedPeople.$inferInsert;
