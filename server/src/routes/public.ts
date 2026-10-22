import { Router } from "express";
import { z } from "zod";
import { all, get } from "../db.js";
import { handler, notFound, parseQuery } from "../lib/http.js";
import { publicSettings } from "../lib/settings.js";
import { findOrderByReference, productSelect, rowToProduct, rowToPublicTracking } from "../lib/serializers.js";
import { normalizePhone } from "../lib/ids.js";

export const publicRouter = Router();

publicRouter.get(
  "/health",
  handler((_req, res) => {
    res.json({ ok: true, status: "up", time: new Date().toISOString() });
  }),
);

publicRouter.get(
  "/settings",
  handler((_req, res) => {
    res.json({ ok: true, settings: publicSettings() });
  }),
);

publicRouter.get(
  "/categories",
  handler((_req, res) => {
    const rows = all<{ id: string; slug: string; name: string; description: string; image_path: string | null; product_count: number }>(
      `SELECT c.id, c.slug, c.name, c.description, c.image_path,
              (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'active') AS product_count
         FROM categories c
        WHERE c.active = 1
        ORDER BY c.sort_order, c.name`,
    );
    res.json({
      ok: true,
      items: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        image: row.image_path,
        productCount: Number(row.product_count),
      })),
    });
  }),
);

publicRouter.get(
  "/brands",
  handler((_req, res) => {
    const rows = all<{ id: string; slug: string; name: string; is_store_brand: number }>(
      "SELECT id, slug, name, is_store_brand FROM brands WHERE active = 1 ORDER BY is_store_brand DESC, name",
    );
    res.json({
      ok: true,
      items: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        isStoreBrand: row.is_store_brand === 1,
      })),
    });
  }),
);

const productListQuery = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(60).optional(),
  brand: z.string().trim().max(60).optional(),
  sort: z.enum(["featured", "name", "price-asc", "price-desc", "newest"]).default("featured"),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  availableOnly: z.enum(["0", "1"]).default("1"),
  limit: z.coerce.number().int().min(1).max(60).default(24),
  offset: z.coerce.number().int().min(0).default(0),
});

publicRouter.get(
  "/products",
  handler((req, res) => {
    const query = parseQuery(productListQuery, req);
    const where: string[] = ["p.status = 'active'"];
    const params: Array<string | number> = [];

    if (query.q) {
      where.push("(p.name LIKE ? OR p.description LIKE ? OR p.size_summary LIKE ? OR c.name LIKE ? OR b.name LIKE ?)");
      const like = `%${query.q.replace(/[%_]/g, "")}%`;
      params.push(like, like, like, like, like);
    }
    if (query.category) {
      where.push("c.slug = ?");
      params.push(query.category);
    }
    if (query.brand) {
      where.push("b.slug = ?");
      params.push(query.brand);
    }
    if (query.minPrice !== undefined) {
      where.push("COALESCE(p.price_pkr, 0) >= ?");
      params.push(query.minPrice);
    }
    if (query.maxPrice !== undefined) {
      where.push("COALESCE(p.price_pkr, 999999999) <= ?");
      params.push(query.maxPrice);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const totalRow = get<{ count: number }>(
      `SELECT COUNT(*) AS count FROM products p
         JOIN categories c ON c.id = p.category_id
         JOIN brands b ON b.id = p.brand_id ${whereSql}`,
      ...params,
    );
    const total = Number(totalRow?.count ?? 0);

    const orderSql =
      query.sort === "name"
        ? "ORDER BY p.name COLLATE NOCASE ASC"
        : query.sort === "price-asc"
          ? "ORDER BY (p.price_pkr IS NULL), p.price_pkr ASC, p.sort_order ASC"
          : query.sort === "price-desc"
            ? "ORDER BY (p.price_pkr IS NULL), p.price_pkr DESC, p.name COLLATE NOCASE ASC"
            : query.sort === "newest"
              ? "ORDER BY p.created_at DESC"
              : "ORDER BY p.sort_order, p.name COLLATE NOCASE ASC";

    const rows = all<Parameters<typeof rowToProduct>[0]>(
      `${productSelect} ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
      ...params,
      query.limit,
      query.offset,
    );

    let items = rows.map((row) => rowToProduct(row));
    if (query.availableOnly === "1") items = items.filter((item) => item.available);

    res.json({
      ok: true,
      items,
      total,
      limit: query.limit,
      offset: query.offset,
      hasMore: query.offset + items.length < total,
    });
  }),
);

publicRouter.get(
  "/products/:slug",
  handler((req, res) => {
    const row = get<Parameters<typeof rowToProduct>[0]>(`${productSelect} WHERE p.slug = ?`, String(req.params.slug));
    if (!row || row.status === "archived") throw notFound("Product not found.");
    const product = rowToProduct(row);
    const related = all<Parameters<typeof rowToProduct>[0]>(
      `${productSelect} WHERE p.category_id = ? AND p.status = 'active' AND p.id != ? ORDER BY p.sort_order LIMIT 4`,
      row.category_id,
      row.id,
    ).map((r) => rowToProduct(r));
    res.json({ ok: true, product, related });
  }),
);

/* ------------------------------------------------------------------ */
/* Tracking                                                            */
/* ------------------------------------------------------------------ */

const trackQuery = z.object({
  ref: z.string().trim().min(6).max(30),
  token: z.string().trim().min(16).max(128).optional(),
});

publicRouter.get(
  "/track",
  handler((req, res) => {
    const query = parseQuery(trackQuery, req);
    const order = findOrderByReference(query.ref);
    if (!order) throw notFound("No pre-order found with that reference number.");
    if (!query.token || order.tracking_token !== query.token) {
      throw notFound("No pre-order found with that reference number.");
    }
    res.json({ ok: true, order: rowToPublicTracking(order) });
  }),
);

const trackBody = z.object({
  reference: z.string().trim().min(6).max(30),
  phone: z.string().trim().min(6).max(30).optional(),
  token: z.string().trim().min(16).max(128).optional(),
});

publicRouter.post(
  "/track",
  handler((req, res) => {
    const body = trackBody.parse(req.body);
    const order = findOrderByReference(body.reference);
    if (!order) throw notFound("No pre-order found with that reference number and phone.");

    const tokenMatch = Boolean(body.token) && order.tracking_token === body.token;
    const phoneMatch = Boolean(body.phone) && normalizePhone(body.phone!) === order.phone_normalized;
    if (!tokenMatch && !phoneMatch) {
      throw notFound("No pre-order found with that reference number and phone.");
    }
    res.json({ ok: true, order: rowToPublicTracking(order) });
  }),
);
