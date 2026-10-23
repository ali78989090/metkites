import { Router } from "express";
import { z } from "zod";
import { all, get, nowIso, run, transaction } from "../db.js";
import { badRequest, conflict, forbidden, handler, parseBody } from "../lib/http.js";
import { rateLimit } from "../lib/auth.js";
import { generateReference, isValidPakMobile, normalizePhone, randomToken } from "../lib/ids.js";
import { getSetting, getSettingBool } from "../lib/settings.js";
import { mongoUpsert } from "../lib/mongo.js";

export const preorderRouter = Router();

export interface WhatsappInfo {
  enabled: boolean;
  number: string;
  message: string;
}

export interface PreorderSubmission {
  reference: string;
  trackingToken: string;
  trackingPath: string;
  status: string;
  submittedAt: string;
  itemsCount: number;
  subtotalPkr: number | null;
  priceStatus: "ok" | "tbc";
  duplicate: boolean;
  whatsapp: WhatsappInfo;
}

const brandNameSchema = z.string().trim().max(80).optional();

const submissionSchema = z.object({
  idempotencyKey: z
    .string()
    .trim()
    .min(8, "Missing submission key.")
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/, "Invalid submission key."),
  customer: z.object({
    firstName: z.string().trim().min(2, "Enter your first name.").max(60),
    lastName: z.string().trim().min(2, "Enter your last name.").max(60),
    phone: z
      .string()
      .trim()
      .max(30)
      .refine(isValidPakMobile, { message: "Enter a valid WhatsApp / mobile number, e.g. 0300 1234567." }),
    address: z.string().trim().min(8, "Enter your full delivery address.").max(500),
    city: z.string().trim().min(2, "Enter your city or area.").max(80),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1).max(60),
        variantId: z.string().trim().min(1).max(60),
        quantity: z.coerce.number().int("Quantity must be a whole number.").min(1, "Quantity must be at least 1.").max(500),
        brandName: brandNameSchema,
      }),
    )
    .min(1, "Your pre-order cart is empty.")
    .max(50, "A pre-order can contain up to 50 lines. Please contact us for larger orders."),
  preferences: z
    .object({
      kiteSize: z.string().trim().max(80).optional(),
      kiteType: z.string().trim().max(80).optional(),
      dorType: z.string().trim().max(80).optional(),
      brandName: brandNameSchema,
    })
    .optional(),
  note: z.string().trim().max(1000).optional(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the pre-order terms to continue." }) }),
});

const submissionLimiter = rateLimit({ windowMs: 60 * 1000, max: 12, keyPrefix: "preorder" });

function whatsappFor(reference: string, itemsCount: number, subtotalPkr: number | null): WhatsappInfo {
  const number = getSetting("business.whatsapp").replace(/[^0-9]/g, "");
  if (!number) return { enabled: false, number: "", message: "" };
  const priceLine =
    subtotalPkr === null
      ? "Price to be confirmed by Metro Lahore Kites"
      : `Estimated total: PKR ${subtotalPkr.toLocaleString("en-PK")}`;
  const message = [
    "Assalam o Alaikum Metro Lahore Kites!",
    `I have submitted pre-order ${reference} (${itemsCount} item${itemsCount === 1 ? "" : "s"}).`,
    priceLine,
    "Please review and confirm availability, final price and delivery. Jazak Allah.",
  ].join("\n");
  return { enabled: true, number, message };
}

preorderRouter.post(
  "/",
  submissionLimiter,
  handler(async (req, res) => {
    if (!getSettingBool("preorders.enabled", true)) {
      throw forbidden(
        "Pre-orders are currently paused by Metro Lahore Kites. Please check back soon or contact us directly.",
      );
    }

    const body = parseBody(submissionSchema, req);

    // Idempotent replay: the same key returns the original order instead of creating a duplicate.
    const existing = get<{ id: string; reference: string; tracking_token: string; status: string; created_at: string; subtotal_pkr: number | null; price_status: string; items_count: number }>(
      "SELECT id, reference, tracking_token, status, created_at, subtotal_pkr, price_status, items_count FROM pre_orders WHERE idempotency_key = ?",
      body.idempotencyKey,
    );
    if (existing) {
      res.json({
        ok: true,
        order: {
          reference: existing.reference,
          trackingToken: existing.tracking_token,
          trackingPath: `/confirmation/${existing.reference}?token=${existing.tracking_token}`,
          status: existing.status,
          submittedAt: existing.created_at,
          itemsCount: Number(existing.items_count),
          subtotalPkr: existing.subtotal_pkr === null ? null : Number(existing.subtotal_pkr),
          priceStatus: existing.price_status === "ok" ? "ok" : "tbc",
          duplicate: true,
          whatsapp: whatsappFor(existing.reference, Number(existing.items_count), existing.subtotal_pkr === null ? null : Number(existing.subtotal_pkr)),
        },
      });
      return;
    }

    // Whitelist: active brands plus brands still referenced by active
    // products (the checkout builds its select from exactly those), plus
    // the deliberate "Other / Custom Brand" escape hatch offered in the UI.
    const allowedBrands = new Set(
      all<{ name: string }>(
        `SELECT DISTINCT b.name FROM brands b WHERE b.active = 1
         UNION
         SELECT DISTINCT b.name FROM products p JOIN brands b ON b.id = p.brand_id WHERE p.status = 'active'`,
      ).map((row) => row.name),
    );
    const customBrandLabel = "Other / Custom Brand";
    const resolveBrand = (value: string | undefined, fallback: string): string => {
      if (!value) return fallback;
      if (allowedBrands.has(value) || value === customBrandLabel) return value;
      throw badRequest(`Brand "${value}" is not available.`, [{ path: "items", message: "Choose a brand from the list." }]);
    };

    interface ResolvedItem {
      productId: string;
      productName: string;
      productSlug: string;
      categoryName: string;
      brandName: string;
      variantName: string;
      unit: string;
      quantity: number;
      unitPricePkr: number | null;
      priceStatus: "configured" | "tbc";
      lineTotalPkr: number | null;
      imagePath: string;
      snapshot: Record<string, unknown>;
    }

    const resolved: ResolvedItem[] = [];
    let allPriced = true;

    for (const line of body.items) {
      const row = get<{
        id: string;
        slug: string;
        name: string;
        status: string;
        unit: string;
        price_pkr: number | null;
        price_status: string;
        category_name: string;
        brand_name: string;
        description: string;
        size_summary: string;
      }>(
        `SELECT p.id, p.slug, p.name, p.status, p.unit, p.price_pkr, p.price_status, p.description, p.size_summary,
                c.name AS category_name, b.name AS brand_name
           FROM products p
           JOIN categories c ON c.id = p.category_id
           JOIN brands b ON b.id = p.brand_id
          WHERE p.id = ?`,
        line.productId,
      );
      if (!row || row.status !== "active") {
        throw badRequest("One of the products in your cart is no longer available. Please review your cart.", [
          { path: "items", message: "A product in your cart is unavailable." },
        ]);
      }
      const variant = get<{ id: string; name: string; size_note: string; price_pkr: number | null; price_status: string; stock_status: string }>(
        "SELECT id, name, size_note, price_pkr, price_status, stock_status FROM product_variants WHERE id = ? AND product_id = ?",
        line.variantId,
        row.id,
      );
      if (!variant) {
        throw badRequest("One of the selected sizes is no longer available. Please review your cart.", [
          { path: "items", message: "A selected size is unavailable." },
        ]);
      }
      if (variant.stock_status !== "available") {
        throw badRequest(`"${row.name} — ${variant.name}" is currently unavailable.`, [
          { path: "items", message: "An item in your cart is out of stock." },
        ]);
      }

      const unitPricePkr = variant.price_pkr !== null ? Number(variant.price_pkr) : row.price_pkr !== null ? Number(row.price_pkr) : null;
      const priceStatus: "configured" | "tbc" = unitPricePkr === null ? "tbc" : "configured";
      if (priceStatus === "tbc") allPriced = false;

      const imagePath =
        get<{ path: string }>("SELECT path FROM product_images WHERE product_id = ? ORDER BY sort_order, created_at LIMIT 1", row.id)
          ?.path ?? "";

      resolved.push({
        productId: row.id,
        productName: row.name,
        productSlug: row.slug,
        categoryName: row.category_name,
        brandName: resolveBrand(line.brandName, row.brand_name),
        variantName: variant.name,
        unit: row.unit,
        quantity: line.quantity,
        unitPricePkr,
        priceStatus,
        lineTotalPkr: unitPricePkr === null ? null : unitPricePkr * line.quantity,
        imagePath,
        snapshot: {
          productSlug: row.slug,
          productName: row.name,
          category: row.category_name,
          brand: row.brand_name,
          description: row.description,
          sizeSummary: row.size_summary,
          variant: variant.name,
          variantNote: variant.size_note,
          unit: row.unit,
        },
      });
    }

    const itemsCount = resolved.reduce((sum, item) => sum + item.quantity, 0);
    const subtotalPkr = allPriced ? resolved.reduce((sum, item) => sum + (item.lineTotalPkr ?? 0), 0) : null;

    // Conditional requirements: order-level kite size / type / dor type are
    // required when the cart actually contains those product types.
    const hasKiteLines = resolved.some((item) => /patang|gudda/i.test(item.categoryName));
    const hasDorLines = resolved.some((item) => /dor|pinna/i.test(item.categoryName));
    const preferences = body.preferences ?? {};
    if (
      preferences.brandName &&
      !allowedBrands.has(preferences.brandName) &&
      preferences.brandName !== customBrandLabel
    ) {
      throw badRequest(`Brand "${preferences.brandName}" is not available. Choose a brand from the list.`, [
        { path: "preferences.brandName", message: "Choose a brand from the list." },
      ]);
    }
    const preferenceIssues: Array<{ path: string; message: string }> = [];
    if (!preferences.brandName) {
      preferenceIssues.push({ path: "preferences.brandName", message: "Select a brand for your pre-order." });
    }
    if (hasKiteLines && !preferences.kiteSize) {
      preferenceIssues.push({ path: "preferences.kiteSize", message: "Select the kite size you prefer." });
    }
    if (hasKiteLines && !preferences.kiteType) {
      preferenceIssues.push({ path: "preferences.kiteType", message: "Select the kite type you prefer." });
    }
    if (hasDorLines && !preferences.dorType) {
      preferenceIssues.push({ path: "preferences.dorType", message: "Select the dor / pinna type you prefer." });
    }
    if (preferenceIssues.length > 0) {
      throw badRequest("Please complete your order preferences.", preferenceIssues);
    }

    const phoneNormalized = normalizePhone(body.customer.phone);
    const createdAt = nowIso();

    let reference = "";
    let trackingToken = "";
    let insertedId = "";

    transaction(() => {
      // Retry a few times in the (unlikely) event of a reference collision.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        reference = generateReference();
        const clash = get("SELECT id FROM pre_orders WHERE reference = ?", reference);
        if (!clash) break;
        reference = "";
      }
      if (!reference) throw conflict("Could not allocate a reference number. Please try again.");
      trackingToken = randomToken(24);

      insertedId = `ord_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      run(
        `INSERT INTO pre_orders (
            id, reference, tracking_token, user_id, is_guest,
            first_name, last_name, phone, phone_normalized, address, city,
            kite_size, kite_type, dor_type, brand_name, order_note,
            status, subtotal_pkr, price_status, items_count, terms_accepted,
            idempotency_key, status_message, admin_notes, created_at, updated_at, status_updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, 1, ?, ?, '', ?, ?, ?)`,
        insertedId,
        reference,
        trackingToken,
        req.user?.id ?? null,
        req.user ? 0 : 1,
        body.customer.firstName,
        body.customer.lastName,
        body.customer.phone,
        phoneNormalized,
        body.customer.address,
        body.customer.city,
        body.preferences?.kiteSize ?? "",
        body.preferences?.kiteType ?? "",
        body.preferences?.dorType ?? "",
        body.preferences?.brandName ?? "",
        body.note ?? "",
        subtotalPkr,
        allPriced ? "ok" : "tbc",
        itemsCount,
        body.idempotencyKey,
        getSetting("status_messages.pending", ""),
        createdAt,
        createdAt,
        createdAt,
      );

      for (const item of resolved) {
        run(
          `INSERT INTO order_items (
              id, order_id, product_id, product_slug, product_name, category_name, brand_name,
              variant_name, unit, quantity, unit_price_pkr, price_status, line_total_pkr, image_path, snapshot_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          `oit_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
          insertedId,
          item.productId,
          item.productSlug,
          item.productName,
          item.categoryName,
          item.brandName,
          item.variantName,
          item.unit,
          item.quantity,
          item.unitPricePkr,
          item.priceStatus,
          item.lineTotalPkr,
          item.imagePath,
          JSON.stringify(item.snapshot),
          createdAt,
        );
      }

      run(
        `INSERT INTO order_status_history (id, order_id, from_status, to_status, note, actor, created_at)
         VALUES (?, ?, NULL, 'pending', ?, ?, ?)`,
        `osh_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
        insertedId,
        "Pre-order submitted through the website.",
        req.user ? "customer" : "guest",
        createdAt,
      );
    });

    // Cloud sync to MongoDB Atlas — awaited before responding
    try {
      await mongoUpsert("pre_orders", {
        id: insertedId,
        reference,
        tracking_token: trackingToken,
        user_id: req.user?.id ?? null,
        is_guest: req.user ? 0 : 1,
        first_name: body.customer.firstName,
        last_name: body.customer.lastName,
        phone: body.customer.phone,
        phone_normalized: phoneNormalized,
        address: body.customer.address,
        city: body.customer.city,
        kite_size: body.preferences?.kiteSize ?? "",
        kite_type: body.preferences?.kiteType ?? "",
        dor_type: body.preferences?.dorType ?? "",
        brand_name: body.preferences?.brandName ?? "",
        order_note: body.note ?? "",
        status: "pending",
        subtotal_pkr: subtotalPkr,
        price_status: allPriced ? "ok" : "tbc",
        items_count: itemsCount,
        terms_accepted: 1,
        idempotency_key: body.idempotencyKey,
        created_at: createdAt,
        updated_at: createdAt,
        status_updated_at: createdAt,
        items: resolved,
      });
    } catch (err) {
      console.warn("[MongoDB Atlas] Pre-order cloud save notice:", (err as Error).message);
    }

    res.status(201).json({
      ok: true,
      order: {
        reference,
        trackingToken,
        trackingPath: `/confirmation/${reference}?token=${trackingToken}`,
        status: "pending",
        submittedAt: createdAt,
        itemsCount,
        subtotalPkr,
        priceStatus: allPriced ? "ok" : "tbc",
        duplicate: false,
        whatsapp: whatsappFor(reference, itemsCount, subtotalPkr),
      },
    });
  }),
);
