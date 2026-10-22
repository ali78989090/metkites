import { DatabaseSync } from "node:sqlite";
import { config, ensureRuntimeDirs } from "./env.js";

ensureRuntimeDirs();

export const db = new DatabaseSync(config.databasePath);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA busy_timeout = 5000;");

/**
 * node:sqlite accepts null | number | bigint | string | Uint8Array.
 * Booleans and undefined must be converted before binding.
 */
export type SqlValue = null | number | bigint | string | Uint8Array;
export type BindValue = SqlValue | boolean | undefined | Date;
export type Row = Record<string, SqlValue>;

export function bind(value: BindValue): SqlValue {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function bindAll(params: BindValue[]): SqlValue[] {
  return params.map(bind);
}

export function run(sql: string, ...params: BindValue[]): { changes: number; lastInsertRowid: number } {
  const result = db.prepare(sql).run(...bindAll(params));
  return {
    changes: Number(result.changes),
    lastInsertRowid: Number(result.lastInsertRowid),
  };
}

export function get<T = Row>(sql: string, ...params: BindValue[]): T | undefined {
  return db.prepare(sql).get(...bindAll(params)) as T | undefined;
}

export function all<T = Row>(sql: string, ...params: BindValue[]): T[] {
  return db.prepare(sql).all(...bindAll(params)) as T[];
}

export function exec(sql: string): void {
  db.exec(sql);
}

/** Runs `fn` inside a SQLite transaction; rolls back on any throw. */
export function transaction<T>(fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* connection already rolled back */
    }
    throw error;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    full_name     TEXT NOT NULL,
    email         TEXT UNIQUE,
    phone         TEXT,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS categories (
    id          TEXT PRIMARY KEY,
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image_path  TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS brands (
    id             TEXT PRIMARY KEY,
    slug           TEXT NOT NULL UNIQUE,
    name           TEXT NOT NULL,
    is_store_brand INTEGER NOT NULL DEFAULT 0,
    active         INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id             TEXT PRIMARY KEY,
    slug           TEXT NOT NULL UNIQUE,
    name           TEXT NOT NULL,
    category_id    TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    brand_id       TEXT NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
    description    TEXT NOT NULL DEFAULT '',
    unit           TEXT NOT NULL DEFAULT 'piece' CHECK (unit IN ('piece','dozen','set','pair')),
    price_pkr      INTEGER,
    price_status   TEXT NOT NULL DEFAULT 'tbc' CHECK (price_status IN ('configured','tbc')),
    price_research TEXT,
    status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
    preorder_only  INTEGER NOT NULL DEFAULT 1,
    size_summary   TEXT NOT NULL DEFAULT '',
    art            TEXT NOT NULL DEFAULT 'patang',
    sort_order     INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
  CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

  CREATE TABLE IF NOT EXISTS product_variants (
    id           TEXT PRIMARY KEY,
    product_id   TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    size_note    TEXT NOT NULL DEFAULT '',
    price_pkr    INTEGER,
    price_status TEXT NOT NULL DEFAULT 'tbc' CHECK (price_status IN ('configured','tbc')),
    stock_status TEXT NOT NULL DEFAULT 'available' CHECK (stock_status IN ('available','unavailable')),
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

  CREATE TABLE IF NOT EXISTS product_images (
    id         TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    path       TEXT NOT NULL,
    alt        TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_primary INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id);

  CREATE TABLE IF NOT EXISTS pre_orders (
    id                TEXT PRIMARY KEY,
    reference         TEXT NOT NULL UNIQUE,
    tracking_token    TEXT NOT NULL UNIQUE,
    user_id           TEXT REFERENCES users(id) ON DELETE SET NULL,
    is_guest          INTEGER NOT NULL DEFAULT 1,
    first_name        TEXT NOT NULL,
    last_name         TEXT NOT NULL,
    phone             TEXT NOT NULL,
    phone_normalized  TEXT NOT NULL,
    address           TEXT NOT NULL,
    city              TEXT NOT NULL,
    kite_size         TEXT NOT NULL DEFAULT '',
    kite_type         TEXT NOT NULL DEFAULT '',
    dor_type          TEXT NOT NULL DEFAULT '',
    brand_name        TEXT NOT NULL DEFAULT '',
    order_note        TEXT NOT NULL DEFAULT '',
    status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','confirmed','preparing','ready','dispatched','delivered','cancelled')),
    subtotal_pkr      INTEGER,
    price_status      TEXT NOT NULL DEFAULT 'tbc' CHECK (price_status IN ('ok','tbc')),
    items_count       INTEGER NOT NULL DEFAULT 0,
    terms_accepted    INTEGER NOT NULL DEFAULT 0,
    idempotency_key   TEXT UNIQUE,
    status_message    TEXT NOT NULL DEFAULT '',
    admin_notes       TEXT NOT NULL DEFAULT '',
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL,
    status_updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_pre_orders_reference ON pre_orders(reference);
  CREATE INDEX IF NOT EXISTS idx_pre_orders_status ON pre_orders(status);
  CREATE INDEX IF NOT EXISTS idx_pre_orders_phone ON pre_orders(phone_normalized);
  CREATE INDEX IF NOT EXISTS idx_pre_orders_created ON pre_orders(created_at);

  CREATE TABLE IF NOT EXISTS order_items (
    id              TEXT PRIMARY KEY,
    order_id        TEXT NOT NULL REFERENCES pre_orders(id) ON DELETE CASCADE,
    product_id      TEXT,
    product_slug    TEXT NOT NULL DEFAULT '',
    product_name    TEXT NOT NULL,
    category_name   TEXT NOT NULL DEFAULT '',
    brand_name      TEXT NOT NULL DEFAULT '',
    variant_name    TEXT NOT NULL DEFAULT '',
    unit            TEXT NOT NULL DEFAULT 'piece',
    quantity        INTEGER NOT NULL DEFAULT 1,
    unit_price_pkr  INTEGER,
    price_status    TEXT NOT NULL DEFAULT 'tbc' CHECK (price_status IN ('configured','tbc')),
    line_total_pkr  INTEGER,
    image_path      TEXT NOT NULL DEFAULT '',
    snapshot_json   TEXT NOT NULL DEFAULT '{}',
    created_at      TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

  CREATE TABLE IF NOT EXISTS order_status_history (
    id         TEXT PRIMARY KEY,
    order_id   TEXT NOT NULL REFERENCES pre_orders(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status  TEXT NOT NULL,
    note       TEXT NOT NULL DEFAULT '',
    actor      TEXT NOT NULL DEFAULT 'system',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_status_history_order ON order_status_history(order_id);

  CREATE TABLE IF NOT EXISTS order_contact_logs (
    id         TEXT PRIMARY KEY,
    order_id   TEXT NOT NULL REFERENCES pre_orders(id) ON DELETE CASCADE,
    channel    TEXT NOT NULL DEFAULT 'whatsapp',
    direction  TEXT NOT NULL DEFAULT 'outbound',
    note       TEXT NOT NULL DEFAULT '',
    staff_name TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_contact_logs_order ON order_contact_logs(order_id);

  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  `,
];

const meta = db.prepare(
  "CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
);
meta.run();
const currentRow = db.prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'").get() as
  | { value?: string }
  | undefined;
const currentVersion = Number(currentRow?.value || 0);

if (currentVersion < MIGRATIONS.length) {
  for (let i = currentVersion; i < MIGRATIONS.length; i += 1) {
    db.exec(MIGRATIONS[i]);
  }
  db.prepare("INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schema_version', ?)").run(
    String(MIGRATIONS.length),
  );
}
