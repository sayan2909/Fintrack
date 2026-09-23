import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// Schema DDL script to guarantee all 9 tables and indexes exist
export const DDL_SCHEMA = `
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

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  type VARCHAR(32) NOT NULL DEFAULT 'Bank Account',
  balance NUMERIC(14, 2) NOT NULL DEFAULT '0',
  account_number VARCHAR(32),
  color VARCHAR(16) NOT NULL DEFAULT '#6366f1',
  icon VARCHAR(32) NOT NULL DEFAULT 'Building2',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
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

-- Ensure account_id column exists if table was previously created without it
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

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

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  ip_address VARCHAR(64),
  user_agent TEXT,
  device VARCHAR(64) NOT NULL DEFAULT 'Desktop',
  browser VARCHAR(64) NOT NULL DEFAULT 'Unknown',
  os VARCHAR(64) NOT NULL DEFAULT 'Unknown',
  last_active TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS categories_user_idx ON categories(user_id);
CREATE INDEX IF NOT EXISTS categories_user_type_idx ON categories(user_id, type);
CREATE INDEX IF NOT EXISTS accounts_user_idx ON accounts(user_id);
CREATE INDEX IF NOT EXISTS tx_user_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS tx_user_date_idx ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS tx_user_cat_idx ON transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS tx_user_account_idx ON transactions(user_id, account_id);
CREATE INDEX IF NOT EXISTS budgets_user_month_idx ON budgets(user_id, month);
CREATE INDEX IF NOT EXISTS goals_user_idx ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS recurring_user_idx ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS notif_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notif_user_read_idx ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);
`;

const globalForDb = globalThis as typeof globalThis & {
  __fintrackDb?: any;
  __fintrackPool?: Pool;
  __fintrackPglite?: PGlite;
  __fintrackInitPromise?: Promise<void>;
};

const databaseUrl = process.env.DATABASE_URL;

// Determine if we should use external PostgreSQL or local embedded PGlite
const isLocalhostPg =
  !databaseUrl ||
  databaseUrl.includes("127.0.0.1:5432") ||
  databaseUrl.includes("localhost:5432");

const shouldUseExternalPg =
  Boolean(databaseUrl) &&
  !isLocalhostPg &&
  process.env.USE_PGLITE !== "true";

let readyResolve: () => void;
const readyPromise = new Promise<void>((resolve) => {
  readyResolve = resolve;
});

function initDatabase() {
  if (globalForDb.__fintrackDb) {
    return globalForDb.__fintrackDb;
  }

  if (shouldUseExternalPg && databaseUrl) {
    try {
      const isLocalHost = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
      const pool =
        globalForDb.__fintrackPool ??
        new Pool({
          connectionString: databaseUrl,
          ssl: isLocalHost ? false : { rejectUnauthorized: false },
          connectionTimeoutMillis: 5000,
        });

      if (process.env.NODE_ENV !== "production") {
        globalForDb.__fintrackPool = pool;
      }

      const dbInstance = drizzleNodePg(pool, { schema });

      pool
        .query(DDL_SCHEMA)
        .then(() => {
          console.log("[FinTrack DB] Connected to external PostgreSQL and schema verified");
          readyResolve();
        })
        .catch((err) => {
          console.warn("[FinTrack DB] Auto-DDL warning on external PG:", err.message);
          readyResolve();
        });

      globalForDb.__fintrackDb = dbInstance;
      return dbInstance;
    } catch (err) {
      console.warn("[FinTrack DB] Failed to connect to external PostgreSQL, falling back to PGlite:", err);
    }
  }

  // Embedded PGlite fallback
  const dataDir = path.join(process.cwd(), "data", "pgdata");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Clean stale lock files from previous abrupt process termination
  const lockFiles = ["postmaster.pid", ".s.PGSQL.5432.lock", ".s.PGSQL.5432.lock.out"];
  for (const lf of lockFiles) {
    const fPath = path.join(dataDir, lf);
    if (fs.existsSync(fPath)) {
      try {
        fs.unlinkSync(fPath);
      } catch {
        // ignore
      }
    }
  }

  console.log("[FinTrack DB] Initializing local embedded PGlite database (./data/pgdata)");

  const pglite =
    globalForDb.__fintrackPglite ??
    new PGlite(dataDir);

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__fintrackPglite = pglite;
  }

  const dbInstance = drizzlePglite(pglite, { schema });

  pglite
    .waitReady
    .then(() => pglite.exec(DDL_SCHEMA))
    .then(() => {
      console.log("[FinTrack DB] Local PGlite ready — all 9 tables & indexes verified");
      readyResolve();
    })
    .catch((err) => {
      console.error("[FinTrack DB] PGlite initialization error:", err);
      readyResolve();
    });

  globalForDb.__fintrackDb = dbInstance;
  return dbInstance;
}

export const db = initDatabase();

export async function ensureDatabaseReady(): Promise<void> {
  await readyPromise;
}
