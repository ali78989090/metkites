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
export const isVercel = Boolean(env.VERCEL || env.VERCEL_ENV || env.NOW_REGION);

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test" || Boolean(env.MLK_TEST);

const defaultDbPath = isVercel
  ? path.join("/tmp", "metrolahorekites.db")
  : path.join(repoRoot, "server", "data", "metrolahorekites.db");

const defaultUploadsDir = isVercel
  ? path.join("/tmp", "uploads")
  : path.join(repoRoot, "server", "uploads");

const allowedOriginsList = (env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (env.VERCEL_URL) {
  allowedOriginsList.push(`https://${env.VERCEL_URL}`);
}
if (env.VERCEL_PROJECT_PRODUCTION_URL) {
  allowedOriginsList.push(`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`);
}

export const config = {
  port: Number(env.PORT || 4000),
  nodeEnv: env.NODE_ENV || "development",
  isProduction,
  isTest,
  isVercel,

  databasePath:
    env.DATABASE_PATH && env.DATABASE_PATH !== ":memory:"
      ? path.resolve(repoRoot, env.DATABASE_PATH)
      : env.DATABASE_PATH === ":memory:"
        ? ":memory:"
        : defaultDbPath,

  uploadsDir:
    env.UPLOADS_DIR && env.UPLOADS_DIR !== ":memory:"
      ? path.resolve(repoRoot, env.UPLOADS_DIR)
      : defaultUploadsDir,

  clientDist: path.join(repoRoot, "client", "dist"),

  session: {
    cookieName: "mlk_session",
    /** 30 days */
    ttlDays: 30,
    secret: env.SESSION_SECRET || "",
  },

  admin: {
    email: (env.ADMIN_EMAIL || "ebad@gmail.com").trim().toLowerCase(),
    name: env.ADMIN_NAME || "Ebad (Admin)",
    password: env.ADMIN_PASSWORD || "03262577882",
  },

  allowedOrigins: allowedOriginsList,

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
    try {
      fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
    } catch {
      /* ignore if exists or read-only filesystem */
    }
  }
  try {
    fs.mkdirSync(config.uploadsDir, { recursive: true });
  } catch {
    /* ignore */
  }

  // On Vercel: copy pre-existing seed database if /tmp/metrolahorekites.db does not exist yet
  if (isVercel && config.databasePath.startsWith("/tmp")) {
    const bundledDb = path.join(repoRoot, "server", "data", "metrolahorekites.db");
    if (!fs.existsSync(config.databasePath) && fs.existsSync(bundledDb)) {
      try {
        fs.copyFileSync(bundledDb, config.databasePath);
      } catch (err) {
        console.warn("Could not copy bundled DB to /tmp:", err);
      }
    }
  }
}
