/**
 * Metro Lahore Kites — end-to-end API QA suite.
 *
 * Boots the real Express app against an in-memory SQLite database on an
 * ephemeral port and exercises the public catalogue, guest checkout,
 * tracking privacy, authentication, admin authorisation, product CRUD,
 * order lifecycle, settings and the nasty edges: idempotent submission,
 * conditional order preferences, status transition rules, rate limiting,
 * CSRF origin checks and archive-not-delete history protection.
 *
 * Run with: npm test
 *
 * Rate-limit budget: POST /api/preorders allows 12/min per IP — this suite
 * deliberately makes exactly 11 calls (each numbered below in section 6).
 * Login (20/10min) is burned as its final test in section 2; no later test
 * signs in again.
 */
import { describe, test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

/* ------------------------------------------------------------------ */
/* Environment — must be set BEFORE any server module is imported so    */
/* that src/env.ts (and the in-memory database) pick these up.          */
/* ------------------------------------------------------------------ */

process.env.MLK_TEST = "1";
process.env.NODE_ENV = "test";
process.env.DATABASE_PATH = ":memory:";
process.env.ADMIN_EMAIL = "admin@mlk.test";
process.env.ADMIN_PASSWORD = "AdminPass123!";
process.env.ADMIN_NAME = "MLK Test Admin";
process.env.BUSINESS_WHATSAPP = "";
process.env.SESSION_SECRET = "test-only-secret-not-used-in-production";

const uploadsDir = path.join(os.tmpdir(), `mlk-test-uploads-${process.pid}`);
process.env.UPLOADS_DIR = uploadsDir;

const { buildApp } = await import("../src/app.js");
const { seedAll } = await import("../src/lib/seed.js");
const { db } = await import("../src/db.js");
const { SETTING_KEYS } = await import("../src/constants.js");

seedAll();

const app = buildApp();
const server: Server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.once("listening", () => resolve()));
const address = server.address() as AddressInfo;
const base = `http://127.0.0.1:${address.port}`;

/* ------------------------------------------------------------------ */
/* Cookie-jar fetch client                                              */
/* ------------------------------------------------------------------ */

interface JsonReply {
  status: number;
  body: any;
  headers: Headers;
}

class TestClient {
  private cookies = new Map<string, string>();

  async request(pathName: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    const cookieHeader = [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
      .join("; ");
    if (cookieHeader) headers.set("cookie", cookieHeader);
    const res = await fetch(base + pathName, { ...init, headers });
    for (const setCookie of res.headers.getSetCookie()) {
      const pair = setCookie.split(";")[0] ?? "";
      const eq = pair.indexOf("=");
      if (eq < 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (!value) this.cookies.delete(name);
      else this.cookies.set(name, decodeURIComponent(value));
    }
    return res;
  }

  async json(pathName: string, init: RequestInit = {}): Promise<JsonReply> {
    const res = await this.request(pathName, init);
    const text = await res.text();
    let body: any = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
    return { status: res.status, body, headers: res.headers };
  }

  get(pathName: string): Promise<JsonReply> {
    return this.json(pathName);
  }

  private jsonWithPayload(method: string, pathName: string, payload?: unknown): Promise<JsonReply> {
    const headers = new Headers();
    if (payload !== undefined) headers.set("content-type", "application/json");
    return this.json(pathName, {
      method,
      headers,
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
    });
  }

  post(pathName: string, payload?: unknown, init: RequestInit = {}): Promise<JsonReply> {
    const headers = new Headers(init.headers);
    if (payload !== undefined) headers.set("content-type", "application/json");
    return this.json(pathName, {
      ...init,
      method: "POST",
      headers,
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
    });
  }

  put(pathName: string, payload?: unknown): Promise<JsonReply> {
    return this.jsonWithPayload("PUT", pathName, payload);
  }

  patch(pathName: string, payload?: unknown): Promise<JsonReply> {
    return this.jsonWithPayload("PATCH", pathName, payload);
  }

  del(pathName: string): Promise<JsonReply> {
    return this.json(pathName, { method: "DELETE" });
  }
}

const anon = new TestClient();
const customer = new TestClient();
const admin = new TestClient();
const tempUser = new TestClient();

/** Sorted `details[].path` values from an error envelope. */
const detailPaths = (body: any): string[] =>
  ((body?.error?.details ?? []) as Array<{ path: string }>).map((d) => String(d.path)).sort();

const CUSTOMER_ONE = {
  firstName: "Testfirst",
  lastName: "Testlast",
  phone: "0300 1234567",
  address: "House 12, Street 3, Model Town Lahore",
  city: "Lahore",
};

/* Shared state filled in as scenarios run. */
let patangId = "";
let dorId = "";
let tapeId = "";
let glovesId = "";
let ref1 = "";
let token1 = "";
let order1Id = "";
let ref10 = "";
let orderOnePayload: any = null;
const TEST_SLUG = "test-flying-spool";
let testProductId = "";
let testProductVariantId = "";
let uploadedFileName = "";

after(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
    server.closeIdleConnections();
    server.closeAllConnections();
  });
  try {
    db.close();
  } catch {
    /* already closed */
  }
});

/* ================================================================== */
/* 1. Public catalogue & settings                                      */
/* ================================================================== */

describe("public catalogue", () => {
  test("health endpoint responds", async () => {
    const { status, body } = await anon.get("/api/health");
    assert.equal(status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.status, "up");
  });

  test("unknown API route returns the standard 404 envelope", async () => {
    const { status, body } = await anon.get("/api/definitely-missing");
    assert.equal(status, 404);
    assert.equal(body.ok, false);
    assert.equal(body.error.code, "not_found");
  });

  test("seeded categories expose the five catalogue groups", async () => {
    const { status, body } = await anon.get("/api/categories");
    assert.equal(status, 200);
    const slugs = (body.items as Array<{ slug: string }>).map((item) => item.slug).sort();
    assert.deepEqual(slugs, ["accessories", "dor-pinna", "gudda", "kite-dor-kits", "patang"]);
    const patang = (body.items as Array<{ slug: string; productCount: number }>).find((c) => c.slug === "patang");
    assert.equal(patang?.productCount, 2);
  });

  test("brands list starts with the store brand", async () => {
    const { status, body } = await anon.get("/api/brands");
    assert.equal(status, 200);
    assert.ok(body.items.length >= 1);
    assert.equal(body.items[0].slug, "metro-lahore-kites");
    assert.equal(body.items[0].isStoreBrand, true);
  });

  test("catalogue lists eight active products, every price to be confirmed", async () => {
    const { status, body } = await anon.get("/api/products");
    assert.equal(status, 200);
    assert.equal(body.total, 8);
    assert.equal(body.items.length, 8);
    for (const item of body.items as Array<any>) {
      assert.equal(item.pricePkr, null, `${item.slug} must not publish an invented price`);
      assert.equal(item.priceStatus, "tbc");
      assert.equal(item.available, true);
    }
    const bySlug = (slug: string) => (body.items as Array<any>).find((p: any) => p.slug === slug);
    patangId = bySlug("classic-patang")?.id ?? "";
    dorId = bySlug("cotton-dor-pinna")?.id ?? "";
    tapeId = bySlug("hand-protection-tape")?.id ?? "";
    glovesId = bySlug("flying-gloves")?.id ?? "";
    assert.ok(patangId && dorId && tapeId && glovesId, "expected seeded product ids");
  });

  test("category filter, search and sorting work", async () => {
    const patang = await anon.get("/api/products?category=patang");
    assert.equal(patang.body.items.length, 2);

    const search = await anon.get("/api/products?q=gudda");
    assert.equal(search.body.items.length, 1);
    assert.equal(search.body.items[0].slug, "gudda");

    const sorted = await anon.get("/api/products?sort=name");
    assert.equal(sorted.body.items[0].name, "Classic Patang");
  });

  test("product detail includes variants and related products", async () => {
    const { status, body } = await anon.get("/api/products/classic-patang");
    assert.equal(status, 200);
    assert.equal(body.product.variants.length, 4);
    assert.equal(body.product.brandIsStoreBrand, true);
    assert.equal(body.product.available, true);
    assert.ok(String(body.product.image).startsWith("/img/products/"));
    assert.ok(body.related.length >= 1 && body.related.length <= 4);
    assert.equal((body.related as Array<any>).some((r: any) => r.slug === "classic-patang"), false);
  });

  test("unknown product slug returns 404", async () => {
    const { status, body } = await anon.get("/api/products/no-such-kite");
    assert.equal(status, 404);
    assert.equal(body.error.code, "not_found");
  });

  test("public settings are curated — no invented WhatsApp number, legal notice present", async () => {
    const { status, body } = await anon.get("/api/settings");
    assert.equal(status, 200);
    assert.deepEqual(Object.keys(body.settings).sort(), [
      "business",
      "legal",
      "options",
      "preorders",
      "statusMessages",
    ]);
    assert.equal(body.settings.business.name, "Metro Lahore Kites");
    assert.equal(body.settings.business.whatsapp, "");
    assert.equal(body.settings.preorders.enabled, true);
    assert.deepEqual(body.settings.options.kiteSizes, ["Small", "Standard", "4 Githi", "4.5 Githi"]);
    assert.match(body.settings.legal.notice, /cotton/i);
    assert.match(body.settings.legal.notice, /glass-coated/i);
    assert.match(body.settings.preorders.terms, /No advance payment/i);
  });
});

/* ================================================================== */
/* 2. Accounts, sessions, CSRF, rate limiting                          */
/* ================================================================== */

describe("accounts and authentication", () => {
  test("visitor can register and becomes a customer", async () => {
    const { status, body } = await customer.post("/api/auth/register", {
      fullName: "Test Customer",
      email: "customer@mlk.test",
      phone: "0333 9876543",
      password: "Customer123",
    });
    assert.equal(status, 201);
    assert.equal(body.user.role, "customer");
    const me = await customer.get("/api/auth/me");
    assert.equal(me.body.user.email, "customer@mlk.test");
    assert.equal(me.body.user.phone, "03339876543");
  });

  test("duplicate registration conflicts", async () => {
    const { status, body } = await anon.post("/api/auth/register", {
      fullName: "Test Customer",
      email: "customer@mlk.test",
      phone: "",
      password: "Customer123",
    });
    assert.equal(status, 409);
    assert.equal(body.error.code, "conflict");
  });

  test("registration validates Pakistani mobile numbers", async () => {
    const { status, body } = await anon.post("/api/auth/register", {
      fullName: "Bad Phone",
      email: "badphone@mlk.test",
      phone: "12345",
      password: "Customer123",
    });
    assert.equal(status, 400);
    assert.equal(body.error.code, "validation_error");
    assert.ok(detailPaths(body).includes("phone"));
  });

  test("account endpoints reject anonymous visitors", async () => {
    const { status, body } = await anon.get("/api/auth/me/orders");
    assert.equal(status, 401);
    assert.equal(body.error.code, "unauthorized");
  });

  test("a fresh customer account has no orders", async () => {
    const { status, body } = await customer.get("/api/auth/me/orders");
    assert.equal(status, 200);
    assert.deepEqual(body.items, []);
  });

  test("customer can update profile details", async () => {
    const { status, body } = await customer.put("/api/auth/me/profile", {
      fullName: "Renamed Customer",
      phone: "03339876543",
    });
    assert.equal(status, 200);
    assert.equal(body.user.fullName, "Renamed Customer");
    assert.equal(body.user.phone, "03339876543");
  });

  test("password change requires the correct current password", async () => {
    const { status, body } = await customer.put("/api/auth/me/profile", {
      newPassword: "NewPass1234",
      currentPassword: "wrong-password",
    });
    assert.equal(status, 400);
    assert.equal(body.error.code, "bad_request");
    assert.ok(detailPaths(body).includes("currentPassword"));
  });

  test("mutations from a foreign origin are blocked (CSRF hardening)", async () => {
    const { status, body } = await anon.post("/api/auth/logout", undefined, {
      headers: { origin: "http://evil.example" },
    });
    assert.equal(status, 403);
    assert.match(body.error.message, /origin/i);
  });

  test("mutations with a matching origin work and sessions log out cleanly", async () => {
    const registered = await tempUser.post("/api/auth/register", {
      fullName: "Temp Person",
      email: "temp@mlk.test",
      phone: "",
      password: "TempPass123",
    });
    assert.equal(registered.status, 201);

    const logout = await tempUser.post("/api/auth/logout", undefined, {
      headers: { origin: base },
    });
    assert.equal(logout.status, 200);

    const me = await tempUser.get("/api/auth/me");
    assert.equal(me.body.user, null);
  });

  test("staff can sign in with the seeded admin credentials", async () => {
    const { status, body } = await admin.post("/api/auth/login", {
      email: "admin@mlk.test",
      password: "AdminPass123!",
    });
    assert.equal(status, 200);
    assert.equal(body.user.role, "admin");
    const me = await admin.get("/api/auth/me");
    assert.equal(me.body.user.role, "admin");
    assert.equal(me.body.user.fullName, "MLK Test Admin");
  });

  test("wrong password is rejected", async () => {
    const { status, body } = await anon.post("/api/auth/login", {
      email: "admin@mlk.test",
      password: "not-the-password",
    });
    assert.equal(status, 401);
    assert.equal(body.error.code, "unauthorized");
    assert.equal(body.error.message, "Incorrect email or password.");
  });

  test("unknown account is rejected with the identical message", async () => {
    const { status, body } = await anon.post("/api/auth/login", {
      email: "ghost@mlk.test",
      password: "whatever123",
    });
    assert.equal(status, 401);
    assert.equal(body.error.message, "Incorrect email or password.");
  });

  test("login validates the email format", async () => {
    const { status, body } = await anon.post("/api/auth/login", {
      email: "not-an-email",
      password: "whatever123",
    });
    assert.equal(status, 400);
    assert.ok(detailPaths(body).includes("email"));
  });

  test("admin routes reject anonymous visitors with 401", async () => {
    const { status, body } = await anon.get("/api/admin/overview");
    assert.equal(status, 401);
    assert.equal(body.error.message, "Sign in to the admin dashboard.");
    const orders = await anon.get("/api/admin/orders");
    assert.equal(orders.status, 401);

    // Verify 4 reported endpoints return 401 for anonymous callers
    assert.equal((await anon.get("/api/admin/brands")).status, 401);
    assert.equal((await anon.get("/api/admin/customers?page=1&pageSize=25")).status, 401);
    assert.equal((await anon.get("/api/admin/audit/logs?page=1&pageSize=25&entity=all")).status, 401);
    assert.equal((await anon.get("/api/admin/settings")).status, 401);
  });

  test("admin routes reject signed-in customers with 403", async () => {
    const { status, body } = await customer.get("/api/admin/overview");
    assert.equal(status, 403);
    assert.equal(body.error.message, "Admin access only.");

    // Verify 4 reported endpoints return 403 for non-admin accounts
    assert.equal((await customer.get("/api/admin/brands")).status, 403);
    assert.equal((await customer.get("/api/admin/customers?page=1&pageSize=25")).status, 403);
    assert.equal((await customer.get("/api/admin/audit/logs?page=1&pageSize=25&entity=all")).status, 403);
    assert.equal((await customer.get("/api/admin/settings")).status, 403);
  });

  test("authenticated admin can load brands, customers, audit logs, and settings", async () => {
    const brands = await admin.get("/api/admin/brands");
    assert.equal(brands.status, 200);
    assert.equal(brands.body.ok, true);
    assert.ok(Array.isArray(brands.body.items));

    const customers = await admin.get("/api/admin/customers?page=1&pageSize=25");
    assert.equal(customers.status, 200);
    assert.equal(customers.body.ok, true);
    assert.ok(Array.isArray(customers.body.items));

    const logs = await admin.get("/api/admin/audit/logs?page=1&pageSize=25&entity=all");
    assert.equal(logs.status, 200);
    assert.equal(logs.body.ok, true);
    assert.ok(Array.isArray(logs.body.items));

    const settings = await admin.get("/api/admin/settings");
    assert.equal(settings.status, 200);
    assert.equal(settings.body.ok, true);
    assert.ok(typeof settings.body.settings === "object");
  });

  // Final login call in the suite — burns the 20/10min limiter.
  test("repeated login failures hit the rate limiter", async () => {
    let limited: JsonReply | null = null;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const res = await anon.post("/api/auth/login", {
        email: "nobody@mlk.test",
        password: "whatever123",
      });
      if (res.status === 403) {
        limited = res;
        break;
      }
      assert.equal(res.status, 401, "unexpected status while burning login attempts");
    }
    assert.ok(limited, "the login rate limiter never triggered");
    assert.match(limited.body.error.message, /Too many requests/i);
    assert.ok(limited.headers.get("retry-after"), "expected a Retry-After header");
  });
});

/* ================================================================== */
/* 3. Admin dashboard basics                                            */
/* ================================================================== */

describe("admin dashboard basics", () => {
  test("settings endpoint returns the full whitelist", async () => {
    const { status, body } = await admin.get("/api/admin/settings");
    assert.equal(status, 200);
    assert.deepEqual(body.keys, [...SETTING_KEYS]);
    for (const key of SETTING_KEYS) {
      assert.ok(key in body.settings, `missing setting ${key}`);
    }
  });

  test("admin can list categories and brands", async () => {
    const cats = await admin.get("/api/admin/categories");
    assert.equal(cats.status, 200);
    assert.ok(cats.body.items.length >= 5);
    assert.equal((cats.body.items as Array<any>).some((c: any) => c.slug === "patang"), true);

    const brands = await admin.get("/api/admin/brands");
    assert.equal(brands.status, 200);
    assert.equal(brands.body.items[0].slug, "metro-lahore-kites");
    assert.equal(brands.body.items[0].is_store_brand, 1);
  });

  test("order list starts empty", async () => {
    const { status, body } = await admin.get("/api/admin/orders");
    assert.equal(status, 200);
    assert.equal(body.total, 0);
    assert.deepEqual(body.items, []);
  });
});

/* ================================================================== */
/* 4. Product CRUD and image media                                      */
/* ================================================================== */

describe("admin product management", () => {
  let accessoriesCategoryId = "";
  let storeBrandId = "";

  test("admin creates a product with variants", async () => {
    const cats = await admin.get("/api/admin/categories");
    accessoriesCategoryId = (cats.body.items as Array<any>).find((c: any) => c.slug === "accessories").id;
    const brands = await admin.get("/api/admin/brands");
    storeBrandId = brands.body.items[0].id;

    const { status, body } = await admin.post("/api/admin/products", {
      name: "Test Flying Spool",
      slug: TEST_SLUG,
      categoryId: accessoriesCategoryId,
      brandId: storeBrandId,
      description: "A throwaway product created by the API test suite.",
      unit: "piece",
      sizeSummary: "Small · Large",
      art: "spool",
      status: "active",
      variants: [
        { name: "Small", sizeNote: "Small test variant.", pricePkr: null, stockStatus: "available", sortOrder: 0 },
        { name: "Large", sizeNote: "Large test variant.", pricePkr: null, stockStatus: "available", sortOrder: 1 },
      ],
    });
    assert.equal(status, 201);
    testProductId = body.product.id;
    testProductVariantId = body.product.variants[0].id;
    assert.equal(body.product.slug, TEST_SLUG);
    assert.equal(body.product.status, "active");
    assert.equal(body.product.priceStatus, "tbc");
    assert.equal(body.product.pricePkr, null);
    assert.equal(body.product.variants.length, 2);
  });

  test("duplicate slug is rejected", async () => {
    const { status, body } = await admin.post("/api/admin/products", {
      name: "Duplicate Spool",
      slug: TEST_SLUG,
      categoryId: accessoriesCategoryId,
      brandId: storeBrandId,
      variants: [{ name: "One" }],
    });
    assert.equal(status, 400);
    assert.ok(detailPaths(body).includes("slug"));
  });

  test("at least one variant is required", async () => {
    const { status, body } = await admin.post("/api/admin/products", {
      name: "Variantless Product",
      slug: "variantless-product",
      categoryId: accessoriesCategoryId,
      brandId: storeBrandId,
    });
    assert.equal(status, 400);
    assert.ok(detailPaths(body).includes("variants"));
  });

  test("unknown category is rejected", async () => {
    const { status, body } = await admin.post("/api/admin/products", {
      name: "Bad Category Product",
      slug: "bad-category-product",
      categoryId: "cat_does_not_exist",
      brandId: storeBrandId,
      variants: [{ name: "One" }],
    });
    assert.equal(status, 400);
    assert.ok(detailPaths(body).includes("categoryId"));
  });

  test("admin can read the product back", async () => {
    const { status, body } = await admin.get(`/api/admin/products/${testProductId}`);
    assert.equal(status, 200);
    assert.equal(body.product.slug, TEST_SLUG);
    assert.equal(body.product.variants.length, 2);
  });

  test("price updates flip the price status and reach the storefront", async () => {
    const patched = await admin.patch(`/api/admin/products/${testProductId}`, {
      name: "Test Flying Spool Mk2",
      pricePkr: 450,
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.product.name, "Test Flying Spool Mk2");
    assert.equal(patched.body.product.pricePkr, 450);
    assert.equal(patched.body.product.priceStatus, "configured");

    const storefront = await anon.get(`/api/products/${TEST_SLUG}`);
    assert.equal(storefront.status, 200);
    assert.equal(storefront.body.product.pricePkr, 450);
    assert.equal(storefront.body.product.priceStatus, "configured");
  });

  test("staff can price a seeded product (used by the priced-order scenario)", async () => {
    const { status, body } = await admin.patch(`/api/admin/products/${glovesId}`, { pricePkr: 750 });
    assert.equal(status, 200);
    assert.equal(body.product.pricePkr, 750);
    assert.equal(body.product.priceStatus, "configured");
  });

  test("image upload, static serving and image deletion", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    const form = new FormData();
    form.append("image", new Blob([png], { type: "image/png" }), "pixel.png");

    const res = await admin.request(`/api/admin/products/${testProductId}/images`, {
      method: "POST",
      body: form,
    });
    assert.equal(res.status, 201);
    const body = (await res.json()) as any;
    assert.equal(body.product.images.length, 1);
    const image = body.product.images[0];
    assert.equal(image.isPrimary, true);
    assert.ok(String(image.path).startsWith("/uploads/products/"));
    uploadedFileName = path.basename(image.path);

    const onDisk = path.join(uploadsDir, "products", uploadedFileName);
    assert.equal(fs.existsSync(onDisk), true, "uploaded file should exist on disk");

    const served = await anon.get(image.path);
    assert.equal(served.status, 200);
    assert.match(served.headers.get("content-type") ?? "", /image\/png/);

    const removed = await admin.del(`/api/admin/products/images/${image.id}`);
    assert.equal(removed.status, 200);
    assert.equal(fs.existsSync(onDisk), false, "deleted image should be removed from disk");
    const after = await admin.get(`/api/admin/products/${testProductId}`);
    assert.equal(after.body.product.images.length, 0);
  });

  test("disallowed image extensions return 400", async () => {
    const form = new FormData();
    form.append("image", new Blob([new Uint8Array([1, 2, 3])], { type: "image/gif" }), "anim.gif");
    const res = await admin.request(`/api/admin/products/${testProductId}/images`, {
      method: "POST",
      body: form,
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.ok, false);
    assert.match(body.error.message, /webp, png, jpg/i);
  });

  test("uploading to the wrong form field returns 400", async () => {
    const form = new FormData();
    form.append("photo", new Blob([new Uint8Array([9])], { type: "image/png" }), "x.png");
    const res = await admin.request(`/api/admin/products/${testProductId}/images`, {
      method: "POST",
      body: form,
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.error.code, "upload_error");
  });

  test("deactivating a product hides it from the storefront list", async () => {
    const { status, body } = await admin.patch(`/api/admin/products/${testProductId}`, {
      status: "inactive",
    });
    assert.equal(status, 200);
    assert.equal(body.product.status, "inactive");

    const list = await anon.get("/api/products?limit=60");
    assert.equal((list.body.items as Array<any>).some((p: any) => p.id === testProductId), false);
  });

  test("deleting a missing product returns 404", async () => {
    const { status } = await admin.del("/api/admin/products/prd_missing");
    assert.equal(status, 404);
  });

  test("malformed JSON payloads return 400 instead of 500", async () => {
    const res = await admin.request("/api/admin/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.error.code, "bad_request");
    assert.match(body.error.message, /invalid json/i);
  });
});

/* ================================================================== */
/* 5. Settings                                                         */
/* ================================================================== */

describe("admin settings", () => {
  test("whatsapp number is sanitised and propagated publicly", async () => {
    const { status, body } = await admin.put("/api/admin/settings", {
      settings: { "business.whatsapp": "0300-1234567" },
    });
    assert.equal(status, 200);
    assert.equal(body.settings["business.whatsapp"], "03001234567");
    assert.equal(body.public.business.whatsapp, "03001234567");

    const publicSettings = await anon.get("/api/settings");
    assert.equal(publicSettings.body.settings.business.whatsapp, "03001234567");
  });

  test("unknown setting keys are ignored (whitelist enforced)", async () => {
    const { status, body } = await admin.put("/api/admin/settings", {
      settings: { "hacker.key": "should-not-save", "business.name": "Metro Lahore Kites" },
    });
    assert.equal(status, 200);
    assert.equal("hacker.key" in body.settings, false);

    const again = await admin.get("/api/admin/settings");
    assert.equal("hacker.key" in again.body.settings, false);
  });

  test("legal notice and status messages are configurable", async () => {
    const { body } = await admin.put("/api/admin/settings", {
      settings: {
        "legal.notice": "Custom legal notice for tests.",
        "status_messages.pending": "Custom pending message for tests.",
        "status_messages.confirmed": "Custom confirmed message for tests.",
      },
    });
    assert.equal(body.settings["legal.notice"], "Custom legal notice for tests.");

    const publicSettings = await anon.get("/api/settings");
    assert.equal(publicSettings.body.settings.legal.notice, "Custom legal notice for tests.");
    assert.equal(publicSettings.body.settings.statusMessages.pending, "Custom pending message for tests.");
    assert.equal(publicSettings.body.settings.statusMessages.confirmed, "Custom confirmed message for tests.");
  });
});

/* ================================================================== */
/* 6. Guest pre-orders — exactly 11 POST /api/preorders calls           */
/* ================================================================== */

describe("guest pre-orders", () => {
  // Call 1 — full valid guest checkout (kites + dor, all prices TBC).
  test("guest submits a full pre-order without login or payment", async () => {
    const patangDetail = await anon.get("/api/products/classic-patang");
    const dorDetail = await anon.get("/api/products/cotton-dor-pinna");
    const patangVariantId = patangDetail.body.product.variants[0].id;
    const dorVariantId = dorDetail.body.product.variants[1].id;

    orderOnePayload = {
      idempotencyKey: "guest-checkout-0001",
      customer: CUSTOMER_ONE,
      items: [
        { productId: patangId, variantId: patangVariantId, quantity: 3 },
        { productId: dorId, variantId: dorVariantId, quantity: 2 },
      ],
      preferences: {
        kiteSize: "Standard",
        kiteType: "Patang",
        dorType: "1 Piece",
        brandName: "Metro Lahore Kites",
      },
      note: "Please call before delivery.",
      acceptTerms: true,
    };

    const { status, body } = await anon.post("/api/preorders", orderOnePayload);
    assert.equal(status, 201);
    assert.equal(body.ok, true);

    const order = body.order;
    assert.match(order.reference, /^MLK-\d{6}-[0-9A-Z]{6}$/);
    assert.match(order.trackingToken, /^[0-9a-f]{48}$/);
    assert.equal(order.trackingPath, `/confirmation/${order.reference}?token=${order.trackingToken}`);
    assert.equal(order.status, "pending");
    assert.equal(order.duplicate, false);
    assert.equal(order.itemsCount, 5);
    assert.equal(order.subtotalPkr, null, "TBC catalogue must not produce a subtotal");
    assert.equal(order.priceStatus, "tbc");
    assert.equal(order.whatsapp.enabled, true, "WhatsApp button must follow the configured number");
    assert.equal(order.whatsapp.number, "03001234567");
    assert.ok(order.whatsapp.message.includes(order.reference));

    ref1 = order.reference;
    token1 = order.trackingToken;

    const list = await admin.get(`/api/admin/orders?q=${ref1}`);
    assert.equal(list.body.total, 1);
    order1Id = list.body.items[0].id;
    assert.ok(order1Id);
  });

  // Call 2 — idempotent replay returns the original order.
  test("replaying the same submission returns the original order", async () => {
    const { status, body } = await anon.post("/api/preorders", orderOnePayload);
    assert.equal(status, 200);
    assert.equal(body.order.duplicate, true);
    assert.equal(body.order.reference, ref1);
    assert.equal(body.order.trackingToken, token1);

    const list = await admin.get(`/api/admin/orders?q=${ref1}`);
    assert.equal(list.body.total, 1, "replay must not create a duplicate order");
  });

  // Call 3 — terms acceptance required.
  test("pre-order terms must be accepted", async () => {
    const { status, body } = await anon.post("/api/preorders", {
      ...orderOnePayload,
      idempotencyKey: "missing-terms-0001",
      acceptTerms: false,
    });
    assert.equal(status, 400);
    assert.equal(body.error.code, "validation_error");
    assert.ok(detailPaths(body).includes("acceptTerms"));
  });

  // Call 4 — server-side phone validation.
  test("invalid phone numbers are rejected server-side", async () => {
    const { status, body } = await anon.post("/api/preorders", {
      ...orderOnePayload,
      idempotencyKey: "bad-phone-0001",
      customer: { ...CUSTOMER_ONE, phone: "12345" },
    });
    assert.equal(status, 400);
    assert.equal(body.error.code, "validation_error");
    assert.ok(detailPaths(body).includes("customer.phone"));
  });

  // Call 5 — kite lines require order-level kite preferences.
  test("kite orders require brand, kite size and kite type", async () => {
    const { status, body } = await anon.post("/api/preorders", {
      idempotencyKey: "kite-no-prefs-0001",
      customer: CUSTOMER_ONE,
      items: [{ productId: patangId, variantId: orderOnePayload.items[0].variantId, quantity: 1 }],
      acceptTerms: true,
    });
    assert.equal(status, 400);
    assert.equal(body.error.message, "Please complete your order preferences.");
    assert.deepEqual(detailPaths(body), [
      "preferences.brandName",
      "preferences.kiteSize",
      "preferences.kiteType",
    ]);
  });

  // Call 6 — dor lines require a dor preference.
  test("dor-only orders require the dor type", async () => {
    const { status, body } = await anon.post("/api/preorders", {
      idempotencyKey: "dor-no-type-0001",
      customer: CUSTOMER_ONE,
      items: [{ productId: dorId, variantId: orderOnePayload.items[1].variantId, quantity: 1 }],
      preferences: { brandName: "Metro Lahore Kites" },
      acceptTerms: true,
    });
    assert.equal(status, 400);
    assert.deepEqual(detailPaths(body), ["preferences.dorType"]);
  });

  // Call 7 — brand preference is always required.
  test("every pre-order requires a brand preference", async () => {
    const tapeDetail = await anon.get("/api/products/hand-protection-tape");
    const tapeVariantId = tapeDetail.body.product.variants[0].id;
    const { status, body } = await anon.post("/api/preorders", {
      idempotencyKey: "no-brand-0001",
      customer: CUSTOMER_ONE,
      items: [{ productId: tapeId, variantId: tapeVariantId, quantity: 1 }],
      preferences: {},
      acceptTerms: true,
    });
    assert.equal(status, 400);
    assert.equal(body.error.message, "Please complete your order preferences.");
    assert.deepEqual(detailPaths(body), ["preferences.brandName"]);
  });

  // Call 8 — brand whitelist is enforced.
  test("brands outside the whitelist are rejected", async () => {
    const { status, body } = await anon.post("/api/preorders", {
      idempotencyKey: "unknown-brand-0001",
      customer: CUSTOMER_ONE,
      items: [{ productId: patangId, variantId: orderOnePayload.items[0].variantId, quantity: 1 }],
      preferences: { brandName: "Not A Brand", kiteSize: "Standard", kiteType: "Patang" },
      acceptTerms: true,
    });
    assert.equal(status, 400);
    assert.equal(body.error.code, "bad_request");
    assert.match(body.error.message, /not available/i);
  });

  // Call 9 — inactive products cannot be ordered.
  test("inactive products in the cart are rejected", async () => {
    const { status, body } = await anon.post("/api/preorders", {
      idempotencyKey: "inactive-product-0001",
      customer: CUSTOMER_ONE,
      items: [{ productId: testProductId, variantId: testProductVariantId, quantity: 1 }],
      preferences: { brandName: "Metro Lahore Kites" },
      acceptTerms: true,
    });
    assert.equal(status, 400);
    assert.match(body.error.message, /no longer available/i);
  });

  // Call 10 — a fully priced order stores a subtotal and a WhatsApp summary.
  test("a fully priced order produces a subtotal", async () => {
    const glovesDetail = await anon.get("/api/products/flying-gloves");
    const glovesVariantId = glovesDetail.body.product.variants[0].id;

    const { status, body } = await anon.post("/api/preorders", {
      idempotencyKey: "priced-order-0001",
      customer: {
        firstName: "Second",
        lastName: "Buyer",
        phone: "+92 321 1122334",
        address: "Office 4, Gulberg III Lahore",
        city: "Lahore",
      },
      items: [{ productId: glovesId, variantId: glovesVariantId, quantity: 2 }],
      preferences: { brandName: "Metro Lahore Kites" },
      acceptTerms: true,
    });
    assert.equal(status, 201);
    ref10 = body.order.reference;
    assert.notEqual(ref10, ref1, "references must be unique");
    assert.equal(body.order.subtotalPkr, 1500);
    assert.equal(body.order.priceStatus, "ok");
    assert.equal(body.order.itemsCount, 2);
    assert.ok(body.order.whatsapp.message.includes("1,500"));
    assert.ok(body.order.whatsapp.message.includes(ref10));
  });

  // Call 11 — staff can pause pre-orders; even a replay is blocked.
  test("pre-orders can be paused by staff", async () => {
    const disabled = await admin.put("/api/admin/settings", {
      settings: { "preorders.enabled": "false" },
    });
    assert.equal(disabled.body.settings["preorders.enabled"], "false");

    const { status, body } = await anon.post("/api/preorders", orderOnePayload);
    assert.equal(status, 403);
    assert.equal(body.error.code, "forbidden");
    assert.match(body.error.message, /paused/i);

    const enabled = await admin.put("/api/admin/settings", {
      settings: { "preorders.enabled": "true" },
    });
    assert.equal(enabled.body.public.preorders.enabled, true);
    const publicSettings = await anon.get("/api/settings");
    assert.equal(publicSettings.body.settings.preorders.enabled, true);
  });
});

/* ================================================================== */
/* 6b. Public tracking — privacy-safe                                  */
/* ================================================================== */

describe("public order tracking", () => {
  const EXPECTED_KEYS = [
    "itemCount",
    "items",
    "latestUpdate",
    "reference",
    "status",
    "statusLabel",
    "statusMessage",
    "statusUpdatedAt",
    "submittedAt",
  ];

  test("tracking by reference and token exposes no personal data", async () => {
    const { status, body } = await anon.get(`/api/track?ref=${ref1}&token=${token1}`);
    assert.equal(status, 200);
    assert.deepEqual(Object.keys(body.order).sort(), EXPECTED_KEYS);

    const raw = JSON.stringify(body.order);
    assert.equal(raw.includes("0300"), false, "phone digits leaked");
    assert.equal(raw.includes("Testfirst"), false, "customer name leaked");
    assert.equal(raw.includes("House 12"), false, "address leaked");
    assert.equal(raw.includes(token1), false, "tracking token must not be echoed back");

    assert.equal(body.order.reference, ref1);
    assert.equal(body.order.status, "pending");
    assert.equal(body.order.statusMessage, "Custom pending message for tests.");
    assert.equal(body.order.itemCount, 5);
    assert.equal(body.order.items.length, 2);
    assert.ok(body.order.latestUpdate);
  });

  test("tracking without a token is refused", async () => {
    const { status, body } = await anon.get(`/api/track?ref=${ref1}`);
    assert.equal(status, 404);
    assert.equal(body.error.code, "not_found");
  });

  test("tracking with the wrong token is refused", async () => {
    const wrong = "0".repeat(48);
    const { status } = await anon.get(`/api/track?ref=${ref1}&token=${wrong}`);
    assert.equal(status, 404);
  });

  test("tracking an unknown reference is refused", async () => {
    const { status } = await anon.get(`/api/track?ref=MLK-991231-ABCDEF&token=${token1}`);
    assert.equal(status, 404);
  });

  test("reference plus phone lookup works and stays privacy-safe", async () => {
    const { status, body } = await anon.post("/api/track", {
      reference: ref1,
      phone: "0300 1234567",
    });
    assert.equal(status, 200);
    assert.deepEqual(Object.keys(body.order).sort(), EXPECTED_KEYS);
    assert.equal(JSON.stringify(body.order).includes("House 12"), false);
  });

  test("the wrong phone number cannot track an order", async () => {
    const { status, body } = await anon.post("/api/track", {
      reference: ref1,
      phone: "03000000000",
    });
    assert.equal(status, 404);
    assert.equal(body.error.code, "not_found");
  });
});

/* ================================================================== */
/* 7. Admin order management                                            */
/* ================================================================== */

describe("admin order management", () => {
  test("order list shows both pre-orders with filters and paging", async () => {
    const all = await admin.get("/api/admin/orders");
    assert.equal(all.status, 200);
    assert.equal(all.body.total, 2);
    assert.equal(all.body.items.length, 2);

    const search = await admin.get(`/api/admin/orders?q=${ref1}`);
    assert.equal(search.body.total, 1);
    assert.equal(search.body.items[0].reference, ref1);

    const confirmed = await admin.get("/api/admin/orders?status=confirmed");
    assert.equal(confirmed.body.total, 0);
    assert.deepEqual(confirmed.body.items, []);

    const paged = await admin.get("/api/admin/orders?pageSize=1&page=2");
    assert.equal(paged.body.items.length, 1);
    assert.equal(paged.body.total, 2);
    assert.equal(paged.body.page, 2);

    const bad = await admin.get("/api/admin/orders?status=bogus");
    assert.equal(bad.status, 400);
  });

  test("date range filters work", async () => {
    const wide = await admin.get("/api/admin/orders?from=2020-01-01&to=2035-01-01");
    assert.equal(wide.body.total, 2);
    const future = await admin.get("/api/admin/orders?from=2035-01-02");
    assert.equal(future.body.total, 0);
  });

  test("admin order detail contains the full private context", async () => {
    const { status, body } = await admin.get(`/api/admin/orders/${order1Id}`);
    assert.equal(status, 200);
    const order = body.order;
    assert.equal(order.reference, ref1);
    assert.equal(order.customer.phone, "0300 1234567");
    assert.equal(order.customer.address, "House 12, Street 3, Model Town Lahore");
    assert.equal(order.isGuest, true);
    assert.equal(order.adminNotes, "");
    assert.equal(order.items.length, 2);
    assert.equal(order.history.length, 1);
    assert.equal(order.history[0].toStatus, "pending");
    assert.equal(order.history[0].actor, "guest");
    assert.equal(order.preferences.kiteSize, "Standard");
    assert.equal(order.orderNote, "Please call before delivery.");

    const missing = await admin.get("/api/admin/orders/ord_missing");
    assert.equal(missing.status, 404);
  });

  test("staff notes and admin notes are saved", async () => {
    const { status, body } = await admin.patch(`/api/admin/orders/${order1Id}`, {
      adminNotes: "Handle with care — customer requested an evening call.",
      note: "Initial review done.",
    });
    assert.equal(status, 200);
    assert.equal(body.order.adminNotes, "Handle with care — customer requested an evening call.");
    const last = body.order.history[body.order.history.length - 1];
    assert.equal(last.note, "Initial review done.");
    assert.equal(last.toStatus, "pending");
    assert.equal(last.actor, "admin@mlk.test");
  });

  test("status changes follow the allowed transition graph", async () => {
    const confirmed = await admin.patch(`/api/admin/orders/${order1Id}`, {
      status: "confirmed",
      note: "Stock confirmed by phone.",
    });
    assert.equal(confirmed.status, 200);
    assert.equal(confirmed.body.order.status, "confirmed");
    assert.equal(confirmed.body.order.statusLabel, "Confirmed");
    assert.equal(confirmed.body.order.statusMessage, "Custom confirmed message for tests.");

    const invalid = await admin.patch(`/api/admin/orders/${order1Id}`, { status: "delivered" });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, "bad_request");
    assert.match(invalid.body.error.message, /Allowed:/);
    assert.ok(detailPaths(invalid.body).includes("status"));

    const cancelled = await admin.patch(`/api/admin/orders/${order1Id}`, {
      status: "cancelled",
      note: "Customer asked to hold.",
    });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.order.status, "cancelled");

    const reopened = await admin.patch(`/api/admin/orders/${order1Id}`, { status: "pending" });
    assert.equal(reopened.status, 200);
    assert.equal(reopened.body.order.status, "pending");

    const detail = await admin.get(`/api/admin/orders/${order1Id}`);
    const transitions = (detail.body.order.history as Array<any>)
      .filter((h: any) => h.fromStatus !== h.toStatus)
      .map((h: any) => `${h.fromStatus}->${h.toStatus}`);
    assert.deepEqual(transitions, [
      "null->pending",
      "pending->confirmed",
      "confirmed->cancelled",
      "cancelled->pending",
    ]);
  });

  test("contact logs record staff communication", async () => {
    const { status, body } = await admin.post(`/api/admin/orders/${order1Id}/contact-logs`, {
      channel: "whatsapp",
      direction: "outbound",
      note: "Sent confirmation message.",
    });
    assert.equal(status, 201);
    assert.equal(body.order.contactLogs.length, 1);
    assert.equal(body.order.contactLogs[0].channel, "whatsapp");
    assert.equal(body.order.contactLogs[0].staffName, "MLK Test Admin");

    const badChannel = await admin.post(`/api/admin/orders/${order1Id}/contact-logs`, {
      channel: "carrier-pigeon",
      note: "hello there",
    });
    assert.equal(badChannel.status, 400);

    const shortNote = await admin.post(`/api/admin/orders/${order1Id}/contact-logs`, {
      note: "x",
    });
    assert.equal(shortNote.status, 400);
    assert.ok(detailPaths(shortNote.body).includes("note"));
  });

  test("order list exports as CSV", async () => {
    const res = await admin.request("/api/admin/orders/export.csv");
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /text\/csv/);
    assert.match(res.headers.get("content-disposition") ?? "", /attachment; filename="pre-orders-/);
    const text = await res.text();
    assert.ok(
      text.includes(
        "Reference,Status,Submitted At,Customer,Phone,City,Address,Items,Subtotal (PKR),Price Status",
      ),
    );
    assert.ok(text.includes(ref1));
    assert.ok(text.includes(ref10));
    assert.ok(text.includes("Testfirst Testlast"));
  });

  test("customer directory groups repeat buyers", async () => {
    const { status, body } = await admin.get("/api/admin/customers");
    assert.equal(status, 200);
    assert.equal(body.total, 2);

    const first = (body.items as Array<any>).find((c: any) => c.phone === "0300 1234567");
    assert.ok(first, "expected the guest buyer in the directory");
    assert.equal(first.orderCount, 1);
    assert.equal(first.city, "Lahore");
    assert.equal(first.registered, false);
    assert.equal(first.totalPkr, 0, "a TBC order contributes no rupees");

    const second = (body.items as Array<any>).find((c: any) => c.phone === "+92 321 1122334");
    assert.ok(second, "expected the priced-order buyer in the directory");
    assert.equal(second.totalPkr, 1500);

    const search = await admin.get("/api/admin/customers?q=03211122334");
    assert.equal(search.body.total, 1);
    assert.equal(search.body.items[0].phone, "+92 321 1122334");
  });

  test("customer directory exports as CSV", async () => {
    const res = await admin.request("/api/admin/customers/export.csv");
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-disposition") ?? "", /attachment; filename="customers-/);
    const text = await res.text();
    assert.ok(text.includes("Phone,Customer,City,Orders,Last Order"));
    assert.ok(text.includes("0300 1234567"));
    assert.ok(text.includes("Lahore"));
  });

  test("overview aggregates the dashboard numbers", async () => {
    const { status, body } = await admin.get("/api/admin/overview");
    assert.equal(status, 200);
    assert.equal(body.overview.total, 2);
    assert.equal(body.overview.pending, 2);
    assert.equal(body.overview.counts.pending, 2);
    assert.equal(body.overview.uniqueCustomers, 2);
    assert.equal(body.overview.activeProducts, 8);
    assert.equal(body.overview.recent.length, 2);
    assert.equal(
      (body.overview.recent as Array<any>).every((r: any) => Boolean(r.phone)),
      true,
      "admin overview includes customer phone for staff",
    );
  });
});

/* ================================================================== */
/* 8. Archive rules — orders keep their history                        */
/* ================================================================== */

describe("product archive rules", () => {
  test("products without orders are hard-deleted", async () => {
    const { status, body } = await admin.del(`/api/admin/products/${testProductId}`);
    assert.equal(status, 200);
    assert.equal(body.archived, false);

    const adminGet = await admin.get(`/api/admin/products/${testProductId}`);
    assert.equal(adminGet.status, 404);

    const publicGet = await anon.get(`/api/products/${TEST_SLUG}`);
    assert.equal(publicGet.status, 404);
  });

  test("products referenced by orders are archived, never destroyed", async () => {
    const { status, body } = await admin.del(`/api/admin/products/${patangId}`);
    assert.equal(status, 200);
    assert.equal(body.archived, true, "ordered products must never be hard-deleted");

    const adminGet = await admin.get(`/api/admin/products/${patangId}`);
    assert.equal(adminGet.status, 200);
    assert.equal(adminGet.body.product.status, "archived");

    const publicDetail = await anon.get("/api/products/classic-patang");
    assert.equal(publicDetail.status, 404, "archived products leave the storefront");

    const publicList = await anon.get("/api/products?limit=60");
    assert.equal((publicList.body.items as Array<any>).some((p: any) => p.id === patangId), false);

    const adminList = await admin.get("/api/admin/products?includeArchived=1");
    assert.equal((adminList.body.items as Array<any>).some((p: any) => p.id === patangId), true);
  });
});

/* ================================================================== */
/* 9. Customer order ownership                                         */
/* ================================================================== */

describe("customer order ownership", () => {
  test("customers only ever see their own orders", async () => {
    const list = await customer.get("/api/auth/me/orders");
    assert.equal(list.status, 200);
    assert.deepEqual(list.body.items, []);

    const foreign = await customer.get(`/api/auth/me/orders/${ref1}`);
    assert.equal(foreign.status, 404, "another customer's order must be indistinguishable from missing");
    assert.equal(foreign.body.error.code, "not_found");
  });
});
