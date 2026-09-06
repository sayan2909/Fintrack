import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
  boolean,
  date,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("INR"),
    theme: varchar("theme", { length: 16 }).notNull().default("light"),
    dateFormat: varchar("date_format", { length: 32 }).notNull().default("DD/MM/YYYY"),
    avatarUrl: text("avatar_url"),
    notifyBudget: boolean("notify_budget").notNull().default(true),
    notifyRecurring: boolean("notify_recurring").notNull().default(true),
    notifyGoals: boolean("notify_goals").notNull().default(true),
    notifySummary: boolean("notify_summary").notNull().default(true),
    hasSeenTour: boolean("has_seen_tour").notNull().default(false),
    resetToken: varchar("reset_token", { length: 255 }),
    resetExpires: timestamp("reset_expires", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("users_email_idx").on(t.email)]
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    type: varchar("type", { length: 16 }).notNull(), // income | expense
    color: varchar("color", { length: 16 }).notNull().default("#6366f1"),
    icon: varchar("icon", { length: 32 }).notNull().default("Tag"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("categories_user_idx").on(t.userId), index("categories_user_type_idx").on(t.userId, t.type)]
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    type: varchar("type", { length: 32 }).notNull().default("Bank Account"),
    balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
    accountNumber: varchar("account_number", { length: 32 }),
    color: varchar("color", { length: 16 }).notNull().default("#6366f1"),
    icon: varchar("icon", { length: 32 }).notNull().default("Building2"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("accounts_user_idx").on(t.userId)]
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
    categoryName: varchar("category_name", { length: 80 }),
    type: varchar("type", { length: 16 }).notNull(), // income | expense
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    date: date("date").notNull(),
    paymentMethod: varchar("payment_method", { length: 32 }).notNull().default("Cash"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("tx_user_idx").on(t.userId),
    index("tx_user_date_idx").on(t.userId, t.date),
    index("tx_user_cat_idx").on(t.userId, t.categoryId),
    index("tx_user_account_idx").on(t.userId, t.accountId),
  ]
);

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    categoryName: varchar("category_name", { length: 80 }).notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    month: varchar("month", { length: 7 }).notNull(), // YYYY-MM
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("budgets_user_month_idx").on(t.userId, t.month)]
);

export const savingsGoals = pgTable(
  "savings_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    targetAmount: numeric("target_amount", { precision: 14, scale: 2 }).notNull(),
    currentAmount: numeric("current_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    targetDate: date("target_date"),
    description: text("description"),
    color: varchar("color", { length: 16 }).notNull().default("#10b981"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("goals_user_idx").on(t.userId)]
);

export const recurringTransactions = pgTable(
  "recurring_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    type: varchar("type", { length: 16 }).notNull(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    categoryName: varchar("category_name", { length: 80 }),
    frequency: varchar("frequency", { length: 16 }).notNull(), // daily|weekly|monthly|yearly
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    paymentMethod: varchar("payment_method", { length: 32 }).notNull().default("Bank Transfer"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("recurring_user_idx").on(t.userId)]
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    message: text("message").notNull(),
    kind: varchar("kind", { length: 32 }).notNull().default("info"), // budget|recurring|goal|summary|info
    isRead: boolean("is_read").notNull().default(false),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notif_user_idx").on(t.userId), index("notif_user_read_idx").on(t.userId, t.isRead)]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    device: varchar("device", { length: 64 }).notNull().default("Desktop"),
    browser: varchar("browser", { length: 64 }).notNull().default("Unknown"),
    os: varchar("os", { length: 64 }).notNull().default("Unknown"),
    lastActive: timestamp("last_active", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sessions_user_idx").on(t.userId),
    index("sessions_token_idx").on(t.token),
    index("sessions_expires_idx").on(t.expiresAt),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

