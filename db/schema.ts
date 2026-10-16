import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const articles = sqliteTable("articles", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull(),
  kind: text("kind").notNull(),
  language: text("language").notNull(),
  source: text("source").notNull(),
  sourceUrl: text("source_url").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull(),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  demo: integer("demo", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull(),
});
export const settings = sqliteTable("settings", {id: text("id").primaryKey(),value: text("value").notNull()});
export const rateLimits = sqliteTable("rate_limits", {id: text("id").primaryKey(),count: integer("count").notNull(),expiresAt: integer("expires_at").notNull()});
export const adminAccounts = sqliteTable("admin_accounts", {
  username: text("username").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  version: integer("version").notNull().default(1),
});
export const adminSessions = sqliteTable("admin_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  username: text("username").notNull(),
  version: integer("version").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
