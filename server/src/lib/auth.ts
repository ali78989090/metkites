import type { NextFunction, Request, RequestHandler, Response } from "express";
import bcrypt from "bcryptjs";
import { config } from "../env.js";
import { all, get, run, nowIso } from "../db.js";
import { randomToken, sha256 } from "./ids.js";
import { forbidden, unauthorized } from "./http.js";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: "customer" | "admin";
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser | null;
  }
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

function expiryDate(): string {
  const ttlMs = config.session.ttlDays * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ttlMs).toISOString();
}

/** Creates a session row and returns the raw token (only ever sent to the client once). */
export function createSession(userId: string): string {
  const token = randomToken(24);
  run(
    "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    sha256(token),
    userId,
    expiryDate(),
    nowIso(),
  );
  return token;
}

export function destroySession(token: string | undefined): void {
  if (!token) return;
  run("DELETE FROM sessions WHERE token_hash = ?", sha256(token));
}

export function destroyAllSessionsForUser(userId: string): void {
  run("DELETE FROM sessions WHERE user_id = ?", userId);
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(config.session.cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.secureCookies,
    path: "/",
    maxAge: config.session.ttlDays * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(config.session.cookieName, { path: "/" });
}

function rowToUser(row: Record<string, unknown>): AuthUser {
  return {
    id: String(row.id),
    fullName: String(row.full_name),
    email: row.email === null || row.email === undefined ? null : String(row.email),
    phone: row.phone === null || row.phone === undefined ? null : String(row.phone),
    role: row.role === "admin" ? "admin" : "customer",
  };
}

/** Resolves `req.user` from the session cookie or Authorization Bearer header (null when anonymous). */
export const sessionMiddleware: RequestHandler = (req, _res, next) => {
  req.user = null;
  let token = req.cookies?.[config.session.cookieName] as string | undefined;
  if (!token && typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.slice(7).trim();
  }
  if (!token) {
    next();
    return;
  }
  const row = get(
    `SELECT u.id, u.full_name, u.email, u.phone, u.role
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?`,
    sha256(token),
    nowIso(),
  );
  if (row) req.user = rowToUser(row);
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    next(unauthorized());
    return;
  }
  next();
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    next(unauthorized("Sign in to the admin dashboard."));
    return;
  }
  if (req.user.role !== "admin") {
    next(forbidden("Admin access only."));
    return;
  }
  next();
};

/**
 * Basic CSRF hardening for cookie-authenticated mutations: when a browser
 * sends an Origin header it must match the request host (or an allow-listed
 * origin). Non-browser clients that omit Origin are unaffected.
 */
export const originCheck: RequestHandler = (req, _res, next) => {
  const method = req.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    next();
    return;
  }
  const origin = req.headers.origin;
  if (!origin) {
    next();
    return;
  }
  const host = req.headers.host;
  const xForwardedHost = req.headers["x-forwarded-host"];
  const allowed = new Set<string>([...(config.allowedOrigins || [])]);
  if (host) {
    allowed.add(`http://${host}`);
    allowed.add(`https://${host}`);
  }
  if (typeof xForwardedHost === "string") {
    allowed.add(`http://${xForwardedHost}`);
    allowed.add(`https://${xForwardedHost}`);
  }
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    /* malformed origin */
  }
  if (allowed.has(origin) || (originHost && allowed.has(`http://${originHost}`)) || (originHost && allowed.has(`https://${originHost}`))) {
    next();
    return;
  }
  next(forbidden("Request blocked: unrecognised origin."));
};

/** Simple in-memory sliding-window limiter for sensitive endpoints. */
export function rateLimit(options: { windowMs: number; max: number; keyPrefix: string }): RequestHandler {
  const hits = new Map<string, number[]>();
  return (req, res, next) => {
    const key = `${options.keyPrefix}:${req.ip || "unknown"}`;
    const now = Date.now();
    const windowStart = now - options.windowMs;
    const timestamps = (hits.get(key) || []).filter((t) => t > windowStart);
    if (timestamps.length >= options.max) {
      res.setHeader("Retry-After", String(Math.ceil(options.windowMs / 1000)));
      next(forbidden("Too many requests. Please wait a moment and try again."));
      return;
    }
    timestamps.push(now);
    hits.set(key, timestamps);
    if (hits.size > 5000) {
      // Opportunistic cleanup to bound memory.
      for (const [k, v] of hits) {
        if (v.every((t) => t <= windowStart)) hits.delete(k);
      }
    }
    next();
  };
}

export function listSessionsForUser(userId: string) {
  return all("SELECT * FROM sessions WHERE user_id = ?", userId);
}
