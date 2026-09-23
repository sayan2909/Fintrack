import { Router } from "express";
import { randomBytes } from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  sessions,
  accounts,
  categories,
  transactions,
  budgets,
  savingsGoals,
  recurringTransactions,
  notifications,
} from "@/db/schema";
import {
  hashPassword,
  verifyPassword,
  signToken,
  validateEmail,
  validatePassword,
  setAuthCookie,
  clearAuthCookie,
  getAuthUser,
  getActiveSession,
  getTokenFromRequest,
} from "@/lib/auth";
import {
  createUserSession,
  listUserSessions,
  destroySessionById,
  destroyAllOtherSessions,
  destroySessionByToken,
  normalizeIp,
} from "@/lib/session";
import { ok, fail, unauthorized } from "@/lib/response";
import { ensureDefaultCategories, ensureDefaultAccount } from "@/lib/server-utils";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { convertAllUserAmounts } from "@/lib/currency";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body ?? {};
    if (!name?.trim()) return fail(res, "Full name is required.", 400);
    if (!email?.trim()) return fail(res, "Email is required.", 400);
    if (!validateEmail(email.trim().toLowerCase())) return fail(res, "Please enter a valid email address.", 400);
    const pwErr = validatePassword(password ?? "");
    if (pwErr) return fail(res, pwErr, 400);
    if (password !== confirmPassword) return fail(res, "Passwords do not match.", 400);

    const normalized = email.trim().toLowerCase();
    const existing = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
    if (existing.length > 0) return fail(res, "An account with this email already exists.", 409);

    const passwordHash = await hashPassword(password);
    const inserted = await db
      .insert(users)
      .values({ name: name.trim(), email: normalized, passwordHash })
      .returning();
    const user = inserted[0];
    await ensureDefaultCategories(user.id);
    await ensureDefaultAccount(user.id);

    const token = signToken({ id: user.id, email: user.email });
    const session = await createUserSession({ userId: user.id, token, req });

    setAuthCookie(res, token);
    return ok(
      res,
      {
        user: { id: user.id, name: user.name, email: user.email, currency: user.currency, theme: user.theme, hasSeenTour: false },
        session: session
          ? {
              id: session.id,
              device: session.device,
              browser: session.browser,
              os: session.os,
              ipAddress: session.ipAddress,
              lastActive: session.lastActive,
              createdAt: session.createdAt,
              expiresAt: session.expiresAt,
              isCurrent: true,
            }
          : null,
      },
      201
    );
  } catch (e) {
    console.error("register error", e);
    return fail(res, "Unable to create account. Please try again.", 500);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const ip =
      (typeof req.headers["x-forwarded-for"] === "string" ? req.headers["x-forwarded-for"].split(",")[0].trim() : null) ||
      (req.headers["x-real-ip"] as string) ||
      req.ip ||
      "127.0.0.1";
    const rateLimit = checkRateLimit(`login:${ip}`, 7, 5 * 60 * 1000);
    if (!rateLimit.allowed) {
      return fail(
        res,
        `Too many sign-in attempts. For your security, please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
        429
      );
    }

    const { email, password } = req.body ?? {};
    if (!email?.trim() || !password) return fail(res, "Email and password are required.", 400);
    const normalized = email.trim().toLowerCase();
    const rows = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
    const user = rows[0];
    if (!user) return fail(res, "Invalid email or password.", 401);
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return fail(res, "Invalid email or password.", 401);

    resetRateLimit(`login:${ip}`);
    await ensureDefaultCategories(user.id);
    const token = signToken({ id: user.id, email: user.email });
    const session = await createUserSession({ userId: user.id, token, req });

    setAuthCookie(res, token);
    return ok(res, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        theme: user.theme,
        dateFormat: user.dateFormat,
        avatarUrl: user.avatarUrl,
        hasSeenTour: user.hasSeenTour ?? false,
      },
      session: session
        ? {
            id: session.id,
            device: session.device,
            browser: session.browser,
            os: session.os,
            ipAddress: session.ipAddress,
            lastActive: session.lastActive,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            isCurrent: true,
          }
        : null,
      token,
    });
  } catch (e) {
    console.error("login error", e);
    return fail(res, "Unable to sign in. Please try again.", 500);
  }
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  const token = getTokenFromRequest(req);
  if (token) {
    await destroySessionByToken(token);
  }
  clearAuthCookie(res);
  return ok(res, { loggedOut: true });
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res, "Not authenticated.");
  return ok(res, { user });
});

// GET /api/auth/session
router.get("/session", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res, "No active session.");
  const session = await getActiveSession(req);
  return ok(res, { user, session });
});

// GET /api/auth/sessions
router.get("/sessions", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res, "Not authenticated.");
  const currentToken = getTokenFromRequest(req);
  const sessionList = await listUserSessions(user.id, currentToken);
  return ok(res, { sessions: sessionList });
});

// DELETE /api/auth/sessions
router.delete("/sessions", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res, "Not authenticated.");

  const currentToken = getTokenFromRequest(req);
  const sessionId = req.query.id as string | undefined;
  const revokeAllOther = req.query.all === "true";

  if (revokeAllOther) {
    if (!currentToken) return fail(res, "Cannot identify current session.", 400);
    const success = await destroyAllOtherSessions(user.id, currentToken);
    return ok(res, { revokedAllOther: success, message: "Logged out of all other devices." });
  }

  if (sessionId) {
    const success = await destroySessionById(sessionId, user.id);
    if (!success) return fail(res, "Failed to revoke session.", 400);
    return ok(res, { revoked: true, message: "Session revoked successfully." });
  }

  return fail(res, "Session ID or ?all=true required.", 400);
});

// POST /api/auth/sessions/sync-ip
router.post("/sessions/sync-ip", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res, "Not authenticated.");
  const token = getTokenFromRequest(req);
  if (!token) return unauthorized(res, "No token found.");

  try {
    const rawIp = req.body?.ipAddress || req.headers["cf-connecting-ip"] || req.headers["x-real-ip"];
    if (!rawIp) return fail(res, "No IP address provided.", 400);
    const cleanIp = normalizeIp(String(rawIp));
    if (cleanIp && cleanIp !== "127.0.0.1") {
      await db
        .update(sessions)
        .set({ ipAddress: cleanIp, lastActive: new Date() })
        .where(eq(sessions.token, token));
    }
    return ok(res, { success: true, ipAddress: cleanIp });
  } catch (err) {
    console.error("[Sync IP] Error updating session IP:", err);
    return fail(res, "Unable to update session IP.", 500);
  }
});

// PUT /api/auth/profile
router.put("/profile", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  try {
    const body = req.body;
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) return fail(res, "Name cannot be empty.", 400);
      updates.name = String(body.name).trim();
    }
    if (body.email !== undefined) {
      const em = String(body.email).trim().toLowerCase();
      if (!validateEmail(em)) return fail(res, "Invalid email address.", 400);
      const existing = await db.select().from(users).where(eq(users.email, em)).limit(1);
      if (existing.length && existing[0].id !== user.id) return fail(res, "Email is already in use.", 409);
      updates.email = em;
    }

    let conversionInfo: { rate: number; fromCurrency: string; toCurrency: string } | null = null;
    if (body.currency !== undefined) {
      const newCurr = String(body.currency).toUpperCase();
      const oldCurr = (user.currency || "INR").toUpperCase();
      if (newCurr !== oldCurr) {
        conversionInfo = await convertAllUserAmounts(user.id, oldCurr, newCurr);
      }
      updates.currency = newCurr;
    }

    if (body.theme !== undefined) updates.theme = String(body.theme);
    if (body.dateFormat !== undefined) updates.dateFormat = String(body.dateFormat);
    if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl || null;
    if (body.notifyBudget !== undefined) updates.notifyBudget = !!body.notifyBudget;
    if (body.notifyRecurring !== undefined) updates.notifyRecurring = !!body.notifyRecurring;
    if (body.notifyGoals !== undefined) updates.notifyGoals = !!body.notifyGoals;
    if (body.notifySummary !== undefined) updates.notifySummary = !!body.notifySummary;
    if (body.hasSeenTour !== undefined) updates.hasSeenTour = Boolean(body.hasSeenTour);
    updates.updatedAt = new Date();
    const rows = await db.update(users).set(updates).where(eq(users.id, user.id)).returning();
    const { passwordHash: _p, resetToken: _r, resetExpires: _e, ...safe } = rows[0];
    return ok(res, { user: safe, conversion: conversionInfo });
  } catch (e) {
    console.error("profile update error", e);
    return fail(res, "Unable to update profile.", 500);
  }
});

// PUT /api/auth/password
router.put("/password", async (req, res) => {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized(res);
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!currentPassword || !newPassword) return fail(res, "Current and new passwords are required.", 400);
    const rows = await db.select().from(users).where(eq(users.id, auth.id)).limit(1);
    const full = rows[0];
    if (!full) return unauthorized(res);
    const valid = await verifyPassword(currentPassword, full.passwordHash);
    if (!valid) return fail(res, "Current password is incorrect.", 400);
    const err = validatePassword(newPassword);
    if (err) return fail(res, err, 400);
    if (newPassword !== confirmPassword) return fail(res, "New passwords do not match.", 400);
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
      .where(eq(users.id, auth.id));
    return ok(res, { message: "Password updated successfully." });
  } catch (e) {
    console.error("password change error", e);
    return fail(res, "Unable to change password.", 500);
  }
});

// POST /api/auth/tour-complete
router.post("/tour-complete", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);
  try {
    await db
      .update(users)
      .set({ hasSeenTour: true, updatedAt: new Date() })
      .where(eq(users.id, user.id));
    return ok(res, { message: "Tour marked as completed.", hasSeenTour: true });
  } catch (e) {
    console.error("tour complete error", e);
    return fail(res, "Unable to update tour status.", 500);
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const ip =
      (typeof req.headers["x-forwarded-for"] === "string" ? req.headers["x-forwarded-for"].split(",")[0].trim() : null) ||
      (req.headers["x-real-ip"] as string) ||
      req.ip ||
      "127.0.0.1";
    const rateLimit = checkRateLimit(`forgot-pw:${ip}`, 5, 5 * 60 * 1000);
    if (!rateLimit.allowed) {
      return fail(
        res,
        `Too many password reset requests from this network. Please wait ${rateLimit.retryAfterSeconds} seconds before requesting again.`,
        429
      );
    }

    const email = req.body?.email;
    if (!email || !validateEmail(String(email).toLowerCase())) {
      return fail(res, "Please enter a valid email address.", 400);
    }
    const normalized = String(email).trim().toLowerCase();
    const rows = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
    if (!rows[0]) {
      return fail(res, "No FinTrack account found with this email address. Please check the spelling or sign up.", 404);
    }

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await db.update(users).set({ resetToken: token, resetExpires: expires }).where(eq(users.id, rows[0].id));

    return ok(res, {
      message: "Password reset link generated successfully.",
      resetToken: token,
      resetUrl: `/reset-password?token=${token}`,
      email: normalized,
      expiresIn: "1 hour",
    });
  } catch (e) {
    console.error("forgot password error:", e);
    return fail(res, "Unable to process password reset request.", 500);
  }
});

// GET /api/auth/reset-password
router.get("/reset-password", async (req, res) => {
  try {
    const token = req.query.token as string | undefined;
    if (!token) return fail(res, "Reset token is required.", 400);
    const rows = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
    const user = rows[0];
    if (!user || !user.resetExpires || new Date(user.resetExpires) < new Date()) {
      return fail(res, "This password reset link is invalid or has expired.", 400);
    }
    return ok(res, { valid: true, email: user.email, name: user.name });
  } catch (e) {
    console.error("verify reset token error:", e);
    return fail(res, "Unable to verify reset token.", 500);
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body || {};
    if (!token) return fail(res, "Reset token is required.", 400);
    const pwErr = validatePassword(password ?? "");
    if (pwErr) return fail(res, pwErr, 400);
    if (password !== confirmPassword) return fail(res, "Passwords do not match.", 400);

    const rows = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
    const user = rows[0];
    if (!user || !user.resetExpires || new Date(user.resetExpires) < new Date()) {
      return fail(res, "This password reset link is invalid or has expired.", 400);
    }

    await db
      .update(users)
      .set({
        passwordHash: await hashPassword(password),
        resetToken: null,
        resetExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return ok(res, { message: "Your password has been reset successfully. You can now sign in with your new password." });
  } catch (e) {
    console.error("reset password error:", e);
    return fail(res, "Unable to reset password.", 500);
  }
});

// DELETE /api/auth/delete-account
router.delete("/delete-account", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  try {
    const { password } = req.body ?? {};
    if (!password) return fail(res, "Your current password is required to delete your account.", 400);

    const userRows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    const dbUser = userRows[0];
    if (!dbUser) return fail(res, "User not found.", 404);

    const valid = await verifyPassword(password, dbUser.passwordHash);
    if (!valid) return fail(res, "Incorrect password. Account deletion aborted.", 401);

    await db.delete(users).where(eq(users.id, user.id));
    clearAuthCookie(res);
    return ok(res, { message: "Your FinTrack account and all associated data have been permanently deleted." });
  } catch (err) {
    console.error("[Delete Account] Error:", err);
    return fail(res, "Unable to delete account. Please try again.", 500);
  }
});

// GET /api/auth/export-data
router.get("/export-data", async (req, res) => {
  const auth = await getAuthUser(req);
  if (!auth) return unauthorized(res);

  try {
    const [
      userRows,
      userAccounts,
      userCategories,
      userTransactions,
      userBudgets,
      userGoals,
      userRecurring,
    ] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          currency: users.currency,
          theme: users.theme,
          dateFormat: users.dateFormat,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, auth.id))
        .limit(1),
      db.select().from(accounts).where(eq(accounts.userId, auth.id)),
      db.select().from(categories).where(eq(categories.userId, auth.id)),
      db.select().from(transactions).where(eq(transactions.userId, auth.id)),
      db.select().from(budgets).where(eq(budgets.userId, auth.id)),
      db.select().from(savingsGoals).where(eq(savingsGoals.userId, auth.id)),
      db.select().from(recurringTransactions).where(eq(recurringTransactions.userId, auth.id)),
    ]);

    const exportPayload = {
      app: "FinTrack",
      version: "2.0.0",
      exportedAt: new Date().toISOString(),
      user: userRows[0] || { id: auth.id, email: auth.email },
      summary: {
        totalAccounts: userAccounts.length,
        totalCategories: userCategories.length,
        totalTransactions: userTransactions.length,
        totalBudgets: userBudgets.length,
        totalGoals: userGoals.length,
        totalRecurringRules: userRecurring.length,
      },
      data: {
        accounts: userAccounts,
        categories: userCategories,
        transactions: userTransactions,
        budgets: userBudgets,
        savingsGoals: userGoals,
        recurringTransactions: userRecurring,
      },
    };

    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="fintrack-backup-${dateStr}.json"`);
    return res.status(200).send(JSON.stringify(exportPayload, null, 2));
  } catch (err) {
    console.error("Data export error:", err);
    return fail(res, "Unable to generate financial data backup.", 500);
  }
});

// POST /api/auth/purge-data
router.post("/purge-data", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  try {
    if (req.body?.confirmation !== "RESET DATA") {
      return fail(res, 'Please type "RESET DATA" to confirm erasing your financial records.', 400);
    }

    await Promise.all([
      db.delete(transactions).where(eq(transactions.userId, user.id)),
      db.delete(budgets).where(eq(budgets.userId, user.id)),
      db.delete(savingsGoals).where(eq(savingsGoals.userId, user.id)),
      db.delete(recurringTransactions).where(eq(recurringTransactions.userId, user.id)),
      db.delete(notifications).where(eq(notifications.userId, user.id)),
      db.delete(accounts).where(and(eq(accounts.userId, user.id), eq(accounts.isDefault, false))),
    ]);

    await db
      .update(accounts)
      .set({ balance: "0.00", updatedAt: new Date() })
      .where(eq(accounts.userId, user.id));

    return ok(res, { message: "All financial records have been reset successfully." });
  } catch (err) {
    console.error("[Purge Data] Error:", err);
    return fail(res, "Unable to reset financial records.", 500);
  }
});

// GET /api/auth/storage-stats
router.get("/storage-stats", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  try {
    const [
      userAccounts,
      userCategories,
      userTransactions,
      userBudgets,
      userGoals,
      userRecurring,
    ] = await Promise.all([
      db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, user.id)),
      db.select({ id: categories.id }).from(categories).where(eq(categories.userId, user.id)),
      db.select({ id: transactions.id }).from(transactions).where(eq(transactions.userId, user.id)),
      db.select({ id: budgets.id }).from(budgets).where(eq(budgets.userId, user.id)),
      db.select({ id: savingsGoals.id }).from(savingsGoals).where(eq(savingsGoals.userId, user.id)),
      db.select({ id: recurringTransactions.id }).from(recurringTransactions).where(eq(recurringTransactions.userId, user.id)),
    ]);

    const totalRecords =
      userAccounts.length +
      userCategories.length +
      userTransactions.length +
      userBudgets.length +
      userGoals.length +
      userRecurring.length;

    const storageFootprintKb = Math.max(
      16,
      Math.round((userTransactions.length * 0.42 + (userAccounts.length + userCategories.length) * 0.28 + 12) * 10) / 10
    );

    return ok(res, {
      userId: user.id,
      email: user.email,
      name: user.name,
      joinedAt: user.createdAt,
      databaseEngine: "PGlite Embedded SQL (Local-First)",
      encryptionStandard: "AES-GCM-256 Client-Encrypted",
      telemetryOptOut: true,
      storageFootprintKb,
      counts: {
        accounts: userAccounts.length,
        categories: userCategories.length,
        transactions: userTransactions.length,
        budgets: userBudgets.length,
        goals: userGoals.length,
        recurring: userRecurring.length,
        totalRecords,
      },
    });
  } catch (err) {
    console.error("[Storage Stats] Error:", err);
    return fail(res, "Unable to fetch storage statistics.", 500);
  }
});

// POST /api/auth/import-data
router.post("/import-data", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return unauthorized(res);

  try {
    const payload = req.body?.data || req.body;
    if (!payload || typeof payload !== "object") {
      return fail(res, "Invalid backup file structure.", 400);
    }

    const {
      categories: rawCategories = [],
      accounts: rawAccounts = [],
      transactions: rawTransactions = [],
    } = payload;

    let importedAccounts = 0;
    let importedCategories = 0;
    let importedTransactions = 0;

    // 1. Process Categories
    if (Array.isArray(rawCategories) && rawCategories.length > 0) {
      const existingCats = await db.select({ name: categories.name }).from(categories).where(eq(categories.userId, user.id));
      const existingSet = new Set(existingCats.map((c) => c.name.toLowerCase().trim()));

      for (const cat of rawCategories) {
        if (cat.name && !existingSet.has(cat.name.toLowerCase().trim())) {
          await db.insert(categories).values({
            userId: user.id,
            name: cat.name.trim(),
            type: cat.type === "income" ? "income" : "expense",
            color: cat.color || "#bbf246",
            icon: cat.icon || "Tag",
            isDefault: false,
          });
          existingSet.add(cat.name.toLowerCase().trim());
          importedCategories++;
        }
      }
    }

    // 2. Process Accounts
    const accountMap = new Map<string, string>();
    const currentAccounts = await db.select().from(accounts).where(eq(accounts.userId, user.id));
    const defaultAcc = currentAccounts.find((a) => a.isDefault) || currentAccounts[0];

    if (Array.isArray(rawAccounts) && rawAccounts.length > 0) {
      for (const acc of rawAccounts) {
        const found = currentAccounts.find((ca) => ca.name.toLowerCase() === acc.name?.toLowerCase());
        if (found) {
          if (acc.id) accountMap.set(acc.id, found.id);
        } else if (acc.name) {
          const [inserted] = await db
            .insert(accounts)
            .values({
              userId: user.id,
              name: acc.name,
              type: acc.type || "Bank Account",
              balance: String(acc.balance || "0.00"),
              accountNumber: acc.accountNumber || null,
              color: acc.color || "#bbf246",
              icon: acc.icon || "Building2",
              isDefault: false,
            })
            .returning();
          if (inserted && acc.id) {
            accountMap.set(acc.id, inserted.id);
          }
          importedAccounts++;
        }
      }
    }

    // 3. Process Transactions
    if (Array.isArray(rawTransactions) && rawTransactions.length > 0) {
      const freshCats = await db.select().from(categories).where(eq(categories.userId, user.id));
      const catMap = new Map<string, string>(freshCats.map((c) => [c.name.toLowerCase(), c.id]));

      for (const tx of rawTransactions) {
        if (tx.amount && tx.description) {
          const targetAccountId = (tx.accountId && accountMap.get(tx.accountId)) || defaultAcc?.id || null;
          let targetCategoryId: string | null = null;
          if (tx.categoryName && catMap.has(tx.categoryName.toLowerCase())) {
            const mapped = catMap.get(tx.categoryName.toLowerCase());
            targetCategoryId = mapped ? String(mapped) : null;
          }

          await db.insert(transactions).values({
            userId: user.id,
            accountId: targetAccountId,
            categoryId: targetCategoryId,
            amount: String(tx.amount),
            type: tx.type === "income" ? "income" : "expense",
            description: tx.description,
            date: tx.date ? new Date(tx.date) : new Date(),
            paymentMethod: tx.paymentMethod || "Bank Transfer",
            status: "completed",
            tags: Array.isArray(tx.tags) ? tx.tags : [],
            receiptUrl: tx.receiptUrl || null,
          });
          importedTransactions++;
        }
      }
    }

    return ok(res, {
      message: "Data archive successfully restored.",
      imported: {
        accounts: importedAccounts,
        categories: importedCategories,
        transactions: importedTransactions,
        total: importedAccounts + importedCategories + importedTransactions,
      },
    });
  } catch (err) {
    console.error("[Import Data] Error:", err);
    return fail(res, "Unable to restore data archive.", 500);
  }
});

export default router;
