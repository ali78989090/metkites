import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import { z } from "zod";
import { all, get, nowIso, run } from "../../db.js";
import { badRequest, handler, notFound, parseBody } from "../../lib/http.js";
import { config } from "../../env.js";
import { productSelect, rowToProduct, imagesFor } from "../../lib/serializers.js";
import { slugify } from "../../lib/ids.js";
import { PRODUCT_STATUSES, UNITS } from "../../constants.js";

export const adminProductsRouter = Router();

const productsUploadDir = path.join(config.uploadsDir, "products");
fs.mkdirSync(productsUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, productsUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".webp";
    cb(null, `up_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".webp", ".png", ".jpg", ".jpeg", ".avif", ".svg"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      // ApiError (not a plain Error) so the client gets a clean 400, not a 500.
      cb(badRequest("Only webp, png, jpg, avif or svg images can be uploaded."));
      return;
    }
    cb(null, true);
  },
});

const variantSchema = z.object({
  id: z.string().trim().max(60).optional(),
  name: z.string().trim().min(1, "Give the variant a name.").max(80),
  sizeNote: z.string().trim().max(240).default(""),
  pricePkr: z.coerce.number().int("Price must be whole rupees.").min(0).max(10_000_000).nullable().optional(),
  stockStatus: z.enum(["available", "unavailable"]).default("available"),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

const productSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name.").max(120),
  slug: z
    .string()
    .trim()
    .max(90)
    .regex(/^[a-z0-9-]*$/, "Use lowercase letters, numbers and hyphens only.")
    .optional(),
  categoryId: z.string().trim().min(1, "Pick a category."),
  brandId: z.string().trim().min(1, "Pick a brand."),
  description: z.string().trim().max(3000).default(""),
  unit: z.enum(UNITS).default("piece"),
  pricePkr: z.coerce.number().int("Price must be whole rupees.").min(0).max(10_000_000).nullable().optional(),
  status: z.enum(PRODUCT_STATUSES).default("active"),
  preorderOnly: z.coerce.boolean().default(true),
  sizeSummary: z.string().trim().max(200).default(""),
  art: z.string().trim().max(60).default(""),
  imagePath: z.string().trim().max(300).optional(),
  imageAlt: z.string().trim().max(200).default(""),
  variants: z.array(variantSchema).min(1, "Add at least one size or variant.").max(30),
});

function priceStatusFor(pricePkr: number | null | undefined): "configured" | "tbc" {
  return pricePkr === null || pricePkr === undefined ? "tbc" : "configured";
}

adminProductsRouter.get(
  "/",
  handler((req, res) => {
    const q = String(req.query.q ?? "").trim();
    const includeArchived = String(req.query.includeArchived ?? "1") === "1";
    const where: string[] = ["1 = 1"];
    const params: Array<string | number> = [];
    if (!includeArchived) where.push("p.status != 'archived'");
    if (q) {
      const like = `%${q.replace(/[%_]/g, "")}%`;
      where.push("(p.name LIKE ? OR p.slug LIKE ? OR c.name LIKE ? OR b.name LIKE ?)");
      params.push(like, like, like, like);
    }
    const rows = all<Parameters<typeof rowToProduct>[0]>(
      `${productSelect} WHERE ${where.join(" AND ")} ORDER BY p.sort_order, p.name COLLATE NOCASE`,
      ...params,
    );
    res.json({ ok: true, items: rows.map((row) => rowToProduct(row)) });
  }),
);

adminProductsRouter.post(
  "/",
  handler((req, res) => {
    const body = parseBody(productSchema, req);
    const slug = body.slug || slugify(body.name) || `product-${Date.now().toString(36)}`;
    if (get("SELECT id FROM products WHERE slug = ?", slug)) {
      throw badRequest("A product with this slug already exists.", [{ path: "slug", message: "Pick a different URL slug." }]);
    }
    if (!get("SELECT id FROM categories WHERE id = ?", body.categoryId)) {
      throw badRequest("Selected category does not exist.", [{ path: "categoryId", message: "Pick a valid category." }]);
    }
    if (!get("SELECT id FROM brands WHERE id = ?", body.brandId)) {
      throw badRequest("Selected brand does not exist.", [{ path: "brandId", message: "Pick a valid brand." }]);
    }

    const now = nowIso();
    const productId = `prd_${crypto.randomBytes(6).toString("hex")}`;
    run(
      `INSERT INTO products (id, slug, name, category_id, brand_id, description, unit, price_pkr, price_status,
                             price_research, status, preorder_only, size_summary, art, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 0, ?, ?)`,
      productId,
      slug,
      body.name,
      body.categoryId,
      body.brandId,
      body.description,
      body.unit,
      body.pricePkr ?? null,
      priceStatusFor(body.pricePkr),
      body.status,
      body.preorderOnly ? 1 : 0,
      body.sizeSummary,
      body.art || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
      now,
      now,
    );

    body.variants.forEach((variant, index) => {
      run(
        `INSERT INTO product_variants (id, product_id, name, size_note, price_pkr, price_status, stock_status, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        `var_${crypto.randomBytes(5).toString("hex")}`,
        productId,
        variant.name,
        variant.sizeNote,
        variant.pricePkr ?? null,
        priceStatusFor(variant.pricePkr),
        variant.stockStatus,
        variant.sortOrder || index,
        now,
        now,
      );
    });

    if (body.imagePath) {
      run(
        `INSERT INTO product_images (id, product_id, path, alt, sort_order, is_primary, created_at)
         VALUES (?, ?, ?, ?, 0, 1, ?)`,
        `img_${crypto.randomBytes(5).toString("hex")}`,
        productId,
        body.imagePath,
        body.imageAlt || `${body.name} product photo`,
        now,
      );
    }

    const row = get<Parameters<typeof rowToProduct>[0]>(`${productSelect} WHERE p.id = ?`, productId)!;
    res.status(201).json({ ok: true, product: rowToProduct(row) });
  }),
);

adminProductsRouter.get(
  "/:id",
  handler((req, res) => {
    const row = get<Parameters<typeof rowToProduct>[0]>(`${productSelect} WHERE p.id = ?`, String(req.params.id));
    if (!row) throw notFound("Product not found.");
    res.json({ ok: true, product: rowToProduct(row) });
  }),
);

adminProductsRouter.patch(
  "/:id",
  handler((req, res) => {
    const body = parseBody(productSchema.partial().extend({ variants: z.array(variantSchema).min(1).max(30).optional() }), req);
    const existing = get<{ id: string; slug: string }>("SELECT id, slug FROM products WHERE id = ?", String(req.params.id));
    if (!existing) throw notFound("Product not found.");

    const now = nowIso();
    run(
      `UPDATE products SET name = COALESCE(?, name),
              category_id = COALESCE(?, category_id),
              brand_id = COALESCE(?, brand_id),
              description = COALESCE(?, description),
              unit = COALESCE(?, unit),
              price_pkr = COALESCE(?, price_pkr),
              price_status = CASE WHEN ? = 1 THEN price_status ELSE price_status END,
              status = COALESCE(?, status),
              preorder_only = COALESCE(?, preorder_only),
              size_summary = COALESCE(?, size_summary),
              art = COALESCE(?, art),
              updated_at = ?
        WHERE id = ?`,
      body.name ?? null,
      body.categoryId ?? null,
      body.brandId ?? null,
      body.description ?? null,
      body.unit ?? null,
      body.pricePkr ?? null,
      0,
      body.status ?? null,
      body.preorderOnly === undefined ? null : body.preorderOnly ? 1 : 0,
      body.sizeSummary ?? null,
      body.art ?? null,
      now,
      existing.id,
    );

    // Keep price_status in sync with the effective price.
    const current = get<{ price_pkr: number | null }>("SELECT price_pkr FROM products WHERE id = ?", existing.id)!;
    run(
      "UPDATE products SET price_status = ? WHERE id = ?",
      current.price_pkr === null ? "tbc" : "configured",
      existing.id,
    );

    if (body.variants) {
      run("DELETE FROM product_variants WHERE product_id = ?", existing.id);
      body.variants.forEach((variant, index) => {
        run(
          `INSERT INTO product_variants (id, product_id, name, size_note, price_pkr, price_status, stock_status, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          variant.id && variant.id.startsWith("var_") ? variant.id : `var_${crypto.randomBytes(5).toString("hex")}`,
          existing.id,
          variant.name,
          variant.sizeNote ?? "",
          variant.pricePkr ?? null,
          priceStatusFor(variant.pricePkr),
          variant.stockStatus,
          variant.sortOrder ?? index,
          now,
          now,
        );
      });
    }

    const row = get<Parameters<typeof rowToProduct>[0]>(`${productSelect} WHERE p.id = ?`, existing.id)!;
    res.json({ ok: true, product: rowToProduct(row) });
  }),
);

adminProductsRouter.post(
  "/:id/images",
  upload.single("image"),
  handler((req, res) => {
    const product = get("SELECT id FROM products WHERE id = ?", String(req.params.id));
    if (!product) {
      if (req.file) fs.unlink(req.file.path, () => undefined);
      throw notFound("Product not found.");
    }
    if (!req.file) throw badRequest("Choose an image to upload.");
    const alt = String(req.body.alt || "").trim().slice(0, 200);
    const count = imagesFor(String(req.params.id)).length;
    const now = nowIso();
    run(
      `INSERT INTO product_images (id, product_id, path, alt, sort_order, is_primary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      `img_${crypto.randomBytes(5).toString("hex")}`,
      String(req.params.id),
      `/uploads/products/${req.file.filename}`,
      alt || "Product photo",
      count,
      count === 0 ? 1 : 0,
      now,
    );
    const row = get<Parameters<typeof rowToProduct>[0]>(`${productSelect} WHERE p.id = ?`, String(req.params.id))!;
    res.status(201).json({ ok: true, product: rowToProduct(row) });
  }),
);

adminProductsRouter.delete(
  "/images/:imageId",
  handler((req, res) => {
    const image = get<{ id: string; product_id: string; path: string }>(
      "SELECT id, product_id, path FROM product_images WHERE id = ?",
      String(req.params.imageId),
    );
    if (!image) throw notFound("Image not found.");
    run("DELETE FROM product_images WHERE id = ?", image.id);
    if (image.path.startsWith("/uploads/")) {
      const filePath = path.join(config.uploadsDir, image.path.replace("/uploads/", ""));
      fs.unlink(filePath, () => undefined);
    }
    const remaining = imagesFor(image.product_id);
    if (remaining.length > 0 && !remaining.some((img) => img.isPrimary)) {
      run("UPDATE product_images SET is_primary = 1 WHERE id = ?", remaining[0].id);
    }
    res.json({ ok: true });
  }),
);

adminProductsRouter.delete(
  "/:id",
  handler((req, res) => {
    const product = get<{ id: string }>("SELECT id FROM products WHERE id = ?", String(req.params.id));
    if (!product) throw notFound("Product not found.");
    // Products referenced by past orders are archived, never hard-deleted,
    // so historical order snapshots stay intact.
    const referenced = get<{ count: number }>("SELECT COUNT(*) AS count FROM order_items WHERE product_id = ?", product.id);
    const now = nowIso();
    if (Number(referenced?.count ?? 0) > 0) {
      run("UPDATE products SET status = 'archived', updated_at = ? WHERE id = ?", now, product.id);
      res.json({ ok: true, archived: true });
      return;
    }
    run("DELETE FROM product_images WHERE product_id = ?", product.id);
    run("DELETE FROM product_variants WHERE product_id = ?", product.id);
    run("DELETE FROM products WHERE id = ?", product.id);
    res.json({ ok: true, archived: false });
  }),
);
