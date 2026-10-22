import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
/** Repository root — works from both `server/src` and `server/dist`. */
export const repoRoot = path.resolve(here, "..", "..");

// Load `<repo>/.env` if present (Node >= 20.12 has process.loadEnvFile).
try {
  process.loadEnvFile(path.join(repoRoot, ".env"));
} catch {
  /* no .env file — fall back to process environment */
}

const env = process.env;

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test" || Boolean(env.MLK_TEST);

export const config = {
  port: Number(env.PORT || 4000),
  nodeEnv: env.NODE_ENV || "development",
  isProduction,
  isTest,

  databasePath:
    env.DATABASE_PATH && env.DATABASE_PATH !== ":memory:"
      ? path.resolve(repoRoot, env.DATABASE_PATH)
      : env.DATABASE_PATH === ":memory:"
        ? ":memory:"
        : path.join(repoRoot, "server", "data", "metrolahorekites.db"),

  uploadsDir:
    env.UPLOADS_DIR && env.UPLOADS_DIR !== ":memory:"
      ? path.resolve(repoRoot, env.UPLOADS_DIR)
      : path.join(repoRoot, "server", "uploads"),

  clientDist: path.join(repoRoot, "client", "dist"),

  session: {
    cookieName: "mlk_session",
    /** 30 days */
    ttlDays: 30,
    secret: env.SESSION_SECRET || "",
  },

  admin: {
    email: (env.ADMIN_EMAIL || "admin@metrolahorekites.pk").trim().toLowerCase(),
    name: env.ADMIN_NAME || "Metro Lahore Kites Admin",
    password: env.ADMIN_PASSWORD || "",
  },

  allowedOrigins: (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  business: {
    whatsapp: (env.BUSINESS_WHATSAPP || "").replace(/[^0-9]/g, ""),
    phone: env.BUSINESS_PHONE || "",
    email: env.BUSINESS_EMAIL || "",
  },

  /** Serve secure cookies only over HTTPS in production. */
  secureCookies: bool(env.SECURE_COOKIES, isProduction),
};

export function ensureRuntimeDirs(): void {
  if (config.databasePath !== ":memory:") {
    fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
  }
  fs.mkdirSync(config.uploadsDir, { recursive: true });
}
