import { PGlite } from "@electric-sql/pglite";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data", "pgdata");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log("[Bootstrap] Initializing PGlite at:", dataDir);
const pglite = new PGlite(dataDir);
await pglite.waitReady;
console.log("[Bootstrap] PGlite engine ready!");

const DDL_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'INR',
  theme VARCHAR(16) NOT NULL DEFAULT 'light',
  date_format VARCHAR(32) NOT NULL DEFAULT 'DD/MM/YYYY',
  avatar_url TEXT,
  notify_budget BOOLEAN NOT NULL DEFAULT true,
  notify_recurring BOOLEAN NOT NULL DEFAULT true,
  notify_goals BOOLEAN NOT NULL DEFAULT true,
  notify_summary BOOLEAN NOT NULL DEFAULT true,
  has_seen_tour BOOLEAN NOT NULL DEFAULT false,
  reset_token VARCHAR(255),
  reset_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  type VARCHAR(16) NOT NULL,
  color VARCHAR(16) NOT NULL DEFAULT '#6366f1',
  icon VARCHAR(32) NOT NULL DEFAULT 'Tag',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  category_name VARCHAR(80),
  type VARCHAR(16) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  payment_method VARCHAR(32) NOT NULL DEFAULT 'Cash',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  category_name VARCHAR(80) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  month VARCHAR(7) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  target_amount NUMERIC(14, 2) NOT NULL,
  current_amount NUMERIC(14, 2) NOT NULL DEFAULT '0',
  target_date DATE,
  description TEXT,
  color VARCHAR(16) NOT NULL DEFAULT '#10b981',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  type VARCHAR(16) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  category_name VARCHAR(80),
  frequency VARCHAR(16) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  payment_method VARCHAR(32) NOT NULL DEFAULT 'Bank Transfer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  kind VARCHAR(32) NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS categories_user_idx ON categories(user_id);
CREATE INDEX IF NOT EXISTS categories_user_type_idx ON categories(user_id, type);
CREATE INDEX IF NOT EXISTS tx_user_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS tx_user_date_idx ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS tx_user_cat_idx ON transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS budgets_user_month_idx ON budgets(user_id, month);
CREATE INDEX IF NOT EXISTS goals_user_idx ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS recurring_user_idx ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS notif_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notif_user_read_idx ON notifications(user_id, is_read);
`;

console.log("[Bootstrap] Executing DDL schema...");
await pglite.exec(DDL_SCHEMA);
console.log("[Bootstrap] All tables and indexes created successfully!");

const res = await pglite.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public';");
console.log("[Bootstrap] Tables in public schema:", res.rows.map(r => r.tablename));

await pglite.close();
console.log("[Bootstrap] Closed PGlite cleanly.");
