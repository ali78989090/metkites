import { Router } from "express";
import { z } from "zod";
import { get, nowIso, run } from "../db.js";
import { handler, parseBody, unauthorized, conflict, badRequest, notFound } from "../lib/http.js";
import {
  clearSessionCookie,
  createSession,
  destroyAllSessionsForUser,
  destroySession,
  hashPassword,
  rateLimit,
  requireAuth,
  setSessionCookie,
  verifyPassword,
} from "../lib/auth.js";
import { normalizePhone } from "../lib/ids.js";
import { config } from "../env.js";
import { findOrderByReference, listOrderRows, rowToOrder } from "../lib/serializers.js";

export const authRouter = Router();

const SESSION_COOKIE = config.session.cookieName;

function publicUser(user: { id: string; fullName: string; email: string | null; phone: string | null; role: string }) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

const loginLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, keyPrefix: "login" });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, keyPrefix: "register" });

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(160);

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(80),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((value) => value === "" || /^03\d{9}$/.test(normalizePhone(value)), {
      message: "Enter a valid Pakistani mobile number, e.g. 0300 1234567.",
    })
    .optional()
    .default(""),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
});

authRouter.post(
  "/register",
  registerLimiter,
  handler((req, res) => {
    const body = parseBody(registerSchema, req);
    const email = body.email;
    const existing = get("SELECT id FROM users WHERE email = ?", email);
    if (existing) throw conflict("An account with this email already exists. Try signing in.");

    const userId = `usr_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    const phone = body.phone ? normalizePhone(body.phone) : null;
    run(
      `INSERT INTO users (id, full_name, email, phone, password_hash, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'customer', ?, ?)`,
      userId,
      body.fullName,
      email,
      phone,
      hashPassword(body.password),
      nowIso(),
      nowIso(),
    );

    const token = createSession(userId);
    setSessionCookie(res, token);
    res.status(201).json({
      ok: true,
      user: { id: userId, fullName: body.fullName, email, phone, role: "customer" },
    });
  }),
);

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(128),
});

authRouter.post(
  "/login",
  loginLimiter,
  handler((req, res) => {
    const body = parseBody(loginSchema, req);
    const row = get<{ id: string; full_name: string; email: string; phone: string | null; role: string; password_hash: string }>(
      "SELECT id, full_name, email, phone, role, password_hash FROM users WHERE email = ?",
      body.email,
    );
    // Same message for unknown email and wrong password.
    if (!row || !verifyPassword(body.password, row.password_hash)) {
      throw unauthorized("Incorrect email or password.");
    }
    const token = createSession(row.id);
    setSessionCookie(res, token);
    res.json({
      ok: true,
      user: publicUser({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        role: row.role,
      }),
    });
  }),
);

authRouter.post(
  "/logout",
  handler((req, res) => {
    destroySession(req.cookies?.[SESSION_COOKIE]);
    clearSessionCookie(res);
    res.json({ ok: true });
  }),
);

authRouter.get(
  "/me",
  handler((req, res) => {
    res.json({ ok: true, user: req.user ? publicUser(req.user) : null });
  }),
);

/* ------------------------------------------------------------------ */
/* Customer account                                                    */
/* ------------------------------------------------------------------ */

authRouter.get(
  "/me/orders",
  requireAuth,
  handler((req, res) => {
    const orders = listOrderRows()
      .filter((row) => row.user_id === req.user!.id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((row) => rowToOrder(row, { includePrivate: false }));
    res.json({ ok: true, items: orders });
  }),
);

authRouter.get(
  "/me/orders/:reference",
  requireAuth,
  handler((req, res) => {
    const order = findOrderByReference(String(req.params.reference));
    // Never reveal whether an order exists for another customer.
    if (!order || order.user_id !== req.user!.id) {
      throw notFound("No pre-order found with that reference number.");
    }
    res.json({ ok: true, order: rowToOrder(order, { includePrivate: false }) });
  }),
);

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((value) => value === "" || /^03\d{9}$/.test(normalizePhone(value)), {
      message: "Enter a valid Pakistani mobile number, e.g. 0300 1234567.",
    })
    .optional(),
  currentPassword: z.string().max(128).optional(),
  newPassword: z.string().min(8, "New password must be at least 8 characters.").max(128).optional(),
});

authRouter.put(
  "/me/profile",
  requireAuth,
  handler((req, res) => {
    const body = parseBody(profileSchema, req);
    const userId = req.user!.id;
    const row = get<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", userId);
    if (!row) throw unauthorized();

    if (body.newPassword) {
      if (!body.currentPassword || !verifyPassword(body.currentPassword, row.password_hash)) {
        throw badRequest("Your current password is incorrect.", [
          { path: "currentPassword", message: "Your current password is incorrect." },
        ]);
      }
      run("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", hashPassword(body.newPassword), nowIso(), userId);
      destroyAllSessionsForUser(userId);
      const token = createSession(userId);
      setSessionCookie(res, token);
    }

    if (body.fullName !== undefined || body.phone !== undefined) {
      const phoneValue =
        body.phone !== undefined ? (body.phone ? normalizePhone(body.phone) : null) : undefined;
      if (phoneValue !== undefined) {
        run("UPDATE users SET phone = ?, updated_at = ? WHERE id = ?", phoneValue, nowIso(), userId);
      }
      if (body.fullName !== undefined) {
        run("UPDATE users SET full_name = ?, updated_at = ? WHERE id = ?", body.fullName, nowIso(), userId);
      }
    }

    const updated = get<{ id: string; full_name: string; email: string; phone: string | null; role: string }>(
      "SELECT id, full_name, email, phone, role FROM users WHERE id = ?",
      userId,
    )!;
    res.json({
      ok: true,
      user: publicUser({
        id: updated.id,
        fullName: updated.full_name,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
      }),
    });
  }),
);
