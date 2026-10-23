import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { all, get, nowIso, run } from "../../db.js";
import { handler, notFound, parseBody, parseQuery } from "../../lib/http.js";
import { requireAdmin } from "../../lib/auth.js";
import { ORDER_STATUSES, SETTING_KEYS } from "../../constants.js";
import { getAllSettings, saveSettings, publicSettings } from "../../lib/settings.js";
import { adminOrdersRouter } from "./orders.js";
import { adminProductsRouter } from "./products.js";
import { adminAuditRouter } from "./audit.js";
import { logAudit } from "../../lib/audit.js";
import { slugify } from "../../lib/ids.js";

export const adminRouter = Router();

// Every route below requires an authenticated admin session.
adminRouter.use(requireAdmin);

adminRouter.get(
  "/overview",
  handler((_req, res) => {
    const counts: Record<string, number> = {};
    for (const status of ORDER_STATUSES) counts[status] = 0;
    const rows = all<{ status: string; count: number }>(
      "SELECT status, COUNT(*) AS count FROM pre_orders GROUP BY status",
    );
    let total = 0;
    for (const row of rows) {
      counts[row.status] = Number(row.count);
      total += Number(row.count);
    }
    const recent = all<{
      id: string;
      reference: string;
      status: string;
      first_name: string;
      last_name: string;
      phone: string;
      city: string;
      items_count: number;
      subtotal_pkr: number | null;
      price_status: string;
      created_at: string;
    }>(
      `SELECT id, reference, status, first_name, last_name, phone, city, items_count, subtotal_pkr, price_status, created_at
         FROM pre_orders ORDER BY created_at DESC LIMIT 8`,
    );
    const customers = get<{ count: number }>("SELECT COUNT(DISTINCT phone_normalized) AS count FROM pre_orders");
    const products = get<{ count: number }>("SELECT COUNT(*) AS count FROM products WHERE status = 'active'");
    res.json({
      ok: true,
      overview: {
        total,
        counts,
        pending: counts.pending,
        confirmed: counts.confirmed,
        preparing: counts.preparing,
        completed: counts.delivered,
        uniqueCustomers: Number(customers?.count ?? 0),
        activeProducts: Number(products?.count ?? 0),
        recent: recent.map((row) => ({
          id: row.id,
          reference: row.reference,
          status: row.status,
          customerName: `${row.first_name} ${row.last_name}`,
          phone: row.phone,
          city: row.city,
          itemsCount: Number(row.items_count),
          subtotalPkr: row.subtotal_pkr === null ? null : Number(row.subtotal_pkr),
          priceStatus: row.price_status,
          createdAt: row.created_at,
        })),
      },
    });
  }),
);

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

adminRouter.get(
  "/settings",
  handler((_req, res) => {
    res.json({ ok: true, settings: getAllSettings(), keys: SETTING_KEYS });
  }),
);

const settingsSchema = z.object({
  settings: z.record(z.string().max(5000)),
});

adminRouter.put(
  "/settings",
  handler((req, res) => {
    const body = parseBody(settingsSchema, req);
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(body.settings)) {
      if (!SETTING_KEYS.includes(key as (typeof SETTING_KEYS)[number])) continue;
      let next = String(value).trim();
      if (key === "business.whatsapp") next = next.replace(/[^0-9]/g, "");
      if (key === "preorders.enabled") next = next === "true" ? "true" : "false";
      cleaned[key] = next;
    }
    saveSettings(cleaned);
    res.json({ ok: true, settings: getAllSettings(), public: publicSettings() });
  }),
);

/* ------------------------------------------------------------------ */
/* Customers                                                           */
/* ------------------------------------------------------------------ */

const customerQuery = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

adminRouter.get(
  "/customers",
  handler((req, res) => {
    const query = parseQuery(customerQuery, req);
    const params: Array<string | number> = [];
    let where = "1 = 1";
    if (query.q) {
      const like = `%${query.q.replace(/[%_]/g, "")}%`;
      where = "(phone LIKE ? OR phone_normalized LIKE ? OR LOWER(first_name || ' ' || last_name) LIKE ? OR LOWER(city) LIKE ?)";
      params.push(like, like, like, like);
    }
    const totalRow = get<{ count: number }>(
      `SELECT COUNT(DISTINCT phone_normalized) AS count FROM pre_orders WHERE ${where}`,
      ...params,
    );
    const rows = all<{
      phone_normalized: string;
      phone: string;
      first_name: string;
      last_name: string;
      city: string;
      orders: number;
      last_order: string;
      last_status: string;
      user_id: string | null;
      total_pkr: number | null;
    }>(
      `SELECT phone_normalized,
              MAX(phone) AS phone,
              (SELECT first_name FROM pre_orders o2 WHERE o2.phone_normalized = o.phone_normalized ORDER BY created_at DESC LIMIT 1) AS first_name,
              (SELECT last_name FROM pre_orders o2 WHERE o2.phone_normalized = o.phone_normalized ORDER BY created_at DESC LIMIT 1) AS last_name,
              (SELECT city FROM pre_orders o2 WHERE o2.phone_normalized = o.phone_normalized ORDER BY created_at DESC LIMIT 1) AS city,
              COUNT(*) AS orders,
              MAX(created_at) AS last_order,
              (SELECT status FROM pre_orders o2 WHERE o2.phone_normalized = o.phone_normalized ORDER BY created_at DESC LIMIT 1) AS last_status,
              (SELECT user_id FROM pre_orders o2 WHERE o2.phone_normalized = o.phone_normalized ORDER BY created_at DESC LIMIT 1) AS user_id,
              SUM(COALESCE(subtotal_pkr, 0)) AS total_pkr
         FROM pre_orders o
        WHERE ${where}
        GROUP BY phone_normalized
        ORDER BY last_order DESC
        LIMIT ? OFFSET ?`,
      ...params,
      query.pageSize,
      (query.page - 1) * query.pageSize,
    );
    res.json({
      ok: true,
      total: Number(totalRow?.count ?? 0),
      page: query.page,
      pageSize: query.pageSize,
      items: rows.map((row) => ({
        phone: row.phone,
        firstName: row.first_name,
        lastName: row.last_name,
        city: row.city,
        orderCount: Number(row.orders),
        lastOrderAt: row.last_order,
        lastStatus: row.last_status,
        registered: Boolean(row.user_id),
        totalPkr: Number(row.total_pkr ?? 0),
      })),
    });
  }),
);

adminRouter.get(
  "/customers/export.csv",
  handler((req, res) => {
    const query = parseQuery(customerQuery, req);
    const params: Array<string | number> = [];
    let where = "1 = 1";
    if (query.q) {
      const like = `%${query.q.replace(/[%_]/g, "")}%`;
      where = "(phone LIKE ? OR phone_normalized LIKE ? OR LOWER(first_name || ' ' || last_name) LIKE ?)";
      params.push(like, like, like);
    }
    const rows = all<Record<string, string | number>>(
      `SELECT phone, MAX(phone) AS phone_display,
              (SELECT first_name FROM pre_orders o2 WHERE o2.phone_normalized = o.phone_normalized ORDER BY created_at DESC LIMIT 1) AS first_name,
              (SELECT last_name FROM pre_orders o2 WHERE o2.phone_normalized = o.phone_normalized ORDER BY created_at DESC LIMIT 1) AS last_name,
              (SELECT city FROM pre_orders o2 WHERE o2.phone_normalized = o.phone_normalized ORDER BY created_at DESC LIMIT 1) AS city,
              COUNT(*) AS orders, MAX(created_at) AS last_order
         FROM pre_orders o WHERE ${where} GROUP BY phone_normalized ORDER BY last_order DESC`,
      ...params,
    );
    const escape = (value: string | number | null): string => {
      const text = value === null ? "" : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const lines = ["Phone,Customer,City,Orders,Last Order"];
    for (const row of rows) {
      lines.push(
        [row.phone_display, `${row.first_name} ${row.last_name}`, row.city, row.orders, row.last_order].map(escape).join(","),
      );
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(`\uFEFF${lines.join("\r\n")}`);
  }),
);

/* ------------------------------------------------------------------ */
/* Categories & brands                                                 */
/* ------------------------------------------------------------------ */

const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().max(70).optional(),
  description: z.string().trim().max(400).default(""),
  imagePath: z.string().trim().max(300).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  active: z.coerce.boolean().default(true),
});

adminRouter.get(
  "/categories",
  handler((_req, res) => {
    const rows = all("SELECT id, slug, name, description, image_path, sort_order, active FROM categories ORDER BY sort_order, name");
    res.json({ ok: true, items: rows });
  }),
);

adminRouter.post(
  "/categories",
  handler((req, res) => {
    const body = parseBody(categorySchema, req);
    const slug = body.slug || slugify(body.name);
    const now = nowIso();
    const id = `cat_${crypto.randomBytes(5).toString("hex")}`;
    run(
      "INSERT INTO categories (id, slug, name, description, image_path, sort_order, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      id,
      slug,
      body.name,
      body.description,
      body.imagePath ?? null,
      body.sortOrder,
      body.active ? 1 : 0,
      now,
      now,
    );
    res.status(201).json({ ok: true, id });
  }),
);

adminRouter.patch(
  "/categories/:id",
  handler((req, res) => {
    const body = parseBody(categorySchema.partial(), req);
    const existing = get("SELECT id FROM categories WHERE id = ?", String(req.params.id));
    if (!existing) throw notFound("Category not found.");
    run(
      `UPDATE categories SET name = COALESCE(?, name), description = COALESCE(?, description),
              image_path = COALESCE(?, image_path), sort_order = COALESCE(?, sort_order),
              active = COALESCE(?, active), updated_at = ?
        WHERE id = ?`,
      body.name ?? null,
      body.description ?? null,
      body.imagePath ?? null,
      body.sortOrder ?? null,
      body.active === undefined ? null : body.active ? 1 : 0,
      nowIso(),
      String(req.params.id),
    );
    res.json({ ok: true });
  }),
);

const brandSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(90).optional(),
  isStoreBrand: z.coerce.boolean().default(false),
  active: z.coerce.boolean().default(true),
});

adminRouter.get(
  "/brands",
  handler((_req, res) => {
    const rows = all("SELECT id, slug, name, is_store_brand, active FROM brands ORDER BY is_store_brand DESC, name");
    res.json({ ok: true, items: rows });
  }),
);

adminRouter.post(
  "/brands",
  handler((req, res) => {
    const body = parseBody(brandSchema, req);
    const slug = body.slug || slugify(body.name);
    const now = nowIso();
    const id = `brd_${crypto.randomBytes(5).toString("hex")}`;
    run(
      "INSERT INTO brands (id, slug, name, is_store_brand, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      id,
      slug,
      body.name,
      body.isStoreBrand ? 1 : 0,
      body.active ? 1 : 0,
      now,
      now,
    );
    res.status(201).json({ ok: true, id });
  }),
);

adminRouter.patch(
  "/brands/:id",
  handler((req, res) => {
    const body = parseBody(brandSchema.partial(), req);
    const existing = get("SELECT id FROM brands WHERE id = ?", String(req.params.id));
    if (!existing) throw notFound("Brand not found.");
    run(
      `UPDATE brands SET name = COALESCE(?, name), is_store_brand = COALESCE(?, is_store_brand),
              active = COALESCE(?, active), updated_at = ? WHERE id = ?`,
      body.name ?? null,
      body.isStoreBrand === undefined ? null : body.isStoreBrand ? 1 : 0,
      body.active === undefined ? null : body.active ? 1 : 0,
      nowIso(),
      String(req.params.id),
    );
    res.json({ ok: true });
  }),
);

adminRouter.use("/orders", adminOrdersRouter);
adminRouter.use("/products", adminProductsRouter);
adminRouter.use("/audit", adminAuditRouter);

