import dns from "node:dns";
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch {
  /* keep system dns if setting fails */
}

import mongoose from "mongoose";
import { config } from "../env.js";
import { db } from "../db.js";

let isConnecting = false;
let isConnected = false;

declare global {
  // eslint-disable-next-line no-var
  var _mlk_mongoose_cache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose | null> | null } | undefined;
}

const cached = global._mlk_mongoose_cache || (global._mlk_mongoose_cache = { conn: null, promise: null });

let isRestored = false;

export async function initMongo(): Promise<typeof mongoose | null> {
  if (config.isTest || !config.mongoUri) {
    return null;
  }
  if (cached.conn && isConnected && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    isConnecting = true;
    cached.promise = mongoose
      .connect(config.mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
      })
      .then((m) => {
        isConnected = true;
        isConnecting = false;
        cached.conn = m;
        console.log("[MongoDB Atlas] Connected successfully to cluster.");
        return m;
      })
      .catch((err) => {
        isConnecting = false;
        cached.promise = null;
        console.warn("[MongoDB Atlas] Connection notice:", (err as Error).message);
        return null;
      });
  }

  try {
    cached.conn = await cached.promise;
    if (cached.conn && !isRestored) {
      await restoreSqliteFromMongo();
    }
    return cached.conn;
  } catch {
    cached.promise = null;
    return null;
  }
}

/**
 * Restores data from MongoDB Atlas into SQLite if SQLite tables are empty.
 */
export async function restoreSqliteFromMongo(): Promise<void> {
  const mongoDb = cached.conn?.connection?.db || mongoose.connection?.db;
  if (!mongoDb) return;
  isRestored = true;

  const tables = [
    "categories",
    "brands",
    "products",
    "product_variants",
    "product_images",
    "users",
    "settings",
    "pre_orders",
    "order_items",
  ];

  for (const table of tables) {
    try {
      const localCount = (db.prepare(`SELECT count(*) as c FROM ${table}`).get() as { c: number })?.c || 0;
      if (localCount === 0) {
        const docs = await mongoDb.collection(table).find().toArray();
        if (docs.length > 0) {
          for (const doc of docs) {
            delete (doc as Record<string, unknown>)._id;
            delete (doc as Record<string, unknown>).items;
            const columns = Object.keys(doc);
            const placeholders = columns.map(() => "?").join(",");
            const values = Object.values(doc).map((v) => {
              if (v === undefined || v === null) return null;
              if (typeof v === "boolean") return v ? 1 : 0;
              if (v instanceof Date) return v.toISOString();
              return v as string | number | bigint | null | Uint8Array;
            });
            db.prepare(
              `INSERT OR REPLACE INTO ${table} (${columns.join(",")}) VALUES (${placeholders})`,
            ).run(...values);
          }
          console.log(`[MongoDB Atlas] Restored ${docs.length} rows into local '${table}' table.`);
        }
      }
    } catch {
      /* ignore if table format differs */
    }
  }
}

/**
 * Awaited upsert into MongoDB Atlas.
 */
export async function mongoUpsert(
  collectionName: string,
  doc: Record<string, unknown>,
  keyField = "id",
): Promise<void> {
  if (config.isTest) return;

  try {
    const m = await initMongo();
    const mongoDb = m?.connection?.db || mongoose.connection.db;
    if (!mongoDb) return;

    const keyValue = doc[keyField];
    const filter = keyValue ? { [keyField]: keyValue } : doc;
    await mongoDb.collection(collectionName).updateOne(filter, { $set: doc }, { upsert: true });
  } catch (err) {
    console.warn(`[MongoDB Atlas] Failed to upsert into ${collectionName}:`, (err as Error).message);
  }
}

/**
 * Awaited update into MongoDB Atlas.
 */
export async function mongoUpdate(
  collectionName: string,
  filter: Record<string, unknown>,
  updateFields: Record<string, unknown>,
): Promise<void> {
  if (config.isTest) return;

  try {
    const m = await initMongo();
    const mongoDb = m?.connection?.db || mongoose.connection.db;
    if (!mongoDb) return;

    await mongoDb.collection(collectionName).updateOne(filter, { $set: updateFields });
  } catch (err) {
    console.warn(`[MongoDB Atlas] Failed to update ${collectionName}:`, (err as Error).message);
  }
}

/**
 * Awaited delete from MongoDB Atlas.
 */
export async function mongoDelete(collectionName: string, filter: Record<string, unknown>): Promise<void> {
  if (config.isTest) return;

  try {
    const m = await initMongo();
    const mongoDb = m?.connection?.db || mongoose.connection.db;
    if (!mongoDb) return;

    await mongoDb.collection(collectionName).deleteOne(filter);
  } catch (err) {
    console.warn(`[MongoDB Atlas] Failed to delete from ${collectionName}:`, (err as Error).message);
  }
}

/**
 * Syncs a specific order from MongoDB Atlas into SQLite by reference or id.
 */
export async function syncOrderFromMongo(
  field: "reference" | "id",
  value: string,
): Promise<boolean> {
  if (config.isTest) return false;

  try {
    const m = await initMongo();
    const mongoDb = m?.connection?.db || mongoose.connection.db;
    if (!mongoDb) return false;

    const val = value.trim();
    const filter =
      field === "reference"
        ? { reference: { $regex: new RegExp(`^${val.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") } }
        : { id: val };
    const orderDoc = (await mongoDb.collection("pre_orders").findOne(filter)) as Record<string, unknown> | null;
    if (!orderDoc) return false;

    // Insert order into SQLite
    const orderCopy = { ...orderDoc };
    const items = (Array.isArray(orderCopy.items) ? orderCopy.items : []) as Array<Record<string, unknown>>;
    delete orderCopy._id;
    delete orderCopy.items;

    const orderCols = Object.keys(orderCopy);
    const orderPlaceholders = orderCols.map(() => "?").join(",");
    const orderVals = Object.values(orderCopy).map((v) => {
      if (v === undefined || v === null) return null;
      if (typeof v === "boolean") return v ? 1 : 0;
      if (v instanceof Date) return v.toISOString();
      return v as string | number | bigint | null | Uint8Array;
    });
    db.prepare(`INSERT OR REPLACE INTO pre_orders (${orderCols.join(",")}) VALUES (${orderPlaceholders})`).run(...orderVals);

    // Insert order items into SQLite
    const orderId = String(orderCopy.id);
    for (const item of items) {
      const itemCopy: Record<string, any> = { ...(item as Record<string, any>), order_id: orderId };
      delete itemCopy._id;
      // Map properties if they were in camelCase
      const resolvedItem = {
        id: itemCopy.id || `oit_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
        order_id: orderId,
        product_id: itemCopy.productId || itemCopy.product_id || null,
        product_slug: itemCopy.productSlug || itemCopy.product_slug || "",
        product_name: itemCopy.productName || itemCopy.product_name || "",
        category_name: itemCopy.categoryName || itemCopy.category_name || "",
        brand_name: itemCopy.brandName || itemCopy.brand_name || "",
        variant_name: itemCopy.variantName || itemCopy.variant_name || "",
        unit: itemCopy.unit || "piece",
        quantity: Number(itemCopy.quantity || 1),
        unit_price_pkr: itemCopy.unitPricePkr !== undefined ? itemCopy.unitPricePkr : (itemCopy.unit_price_pkr ?? null),
        price_status: itemCopy.priceStatus || itemCopy.price_status || "tbc",
        line_total_pkr: itemCopy.lineTotalPkr !== undefined ? itemCopy.lineTotalPkr : (itemCopy.line_total_pkr ?? null),
        image_path: itemCopy.imagePath || itemCopy.image_path || "",
        snapshot_json: typeof itemCopy.snapshot === "object" ? JSON.stringify(itemCopy.snapshot) : String(itemCopy.snapshot_json || "{}"),
        created_at: String(itemCopy.createdAt || itemCopy.created_at || orderCopy.created_at || new Date().toISOString()),
      };

      const itemCols = Object.keys(resolvedItem);
      const itemPlaceholders = itemCols.map(() => "?").join(",");
      const itemVals = Object.values(resolvedItem).map((v) => {
        if (v === undefined || v === null) return null;
        if (typeof v === "boolean") return v ? 1 : 0;
        return v as string | number | bigint | null | Uint8Array;
      });
      db.prepare(`INSERT OR REPLACE INTO order_items (${itemCols.join(",")}) VALUES (${itemPlaceholders})`).run(...itemVals);
    }

    // Insert fallback order status history so tracking latestUpdate displays properly
    const existingHistory = (db.prepare("SELECT count(*) as c FROM order_status_history WHERE order_id = ?").get(orderId) as { c: number } | undefined)?.c || 0;
    if (existingHistory === 0) {
      db.prepare(
        `INSERT INTO order_status_history (id, order_id, from_status, to_status, note, actor, created_at)
         VALUES (?, ?, NULL, ?, ?, ?, ?)`,
      ).run(
        `osh_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
        orderId,
        String(orderCopy.status || "pending"),
        "Pre-order synced from MongoDB Atlas cloud database.",
        orderCopy.is_guest ? "guest" : "customer",
        String(orderCopy.created_at || new Date().toISOString()),
      );
    }

    return true;
  } catch (err) {
    console.warn(`[MongoDB Atlas] Failed to sync order ${field}=${value}:`, (err as Error).message);
    return false;
  }
}

/**
 * Syncs all orders from MongoDB Atlas into SQLite.
 */
export async function syncAllOrdersFromMongo(): Promise<void> {
  if (config.isTest) return;

  try {
    const m = await initMongo();
    const mongoDb = m?.connection?.db || mongoose.connection.db;
    if (!mongoDb) return;

    const orderDocs = (await mongoDb.collection("pre_orders").find().toArray()) as Array<Record<string, unknown>>;
    for (const orderDoc of orderDocs) {
      const orderCopy = { ...orderDoc };
      const items = (Array.isArray(orderCopy.items) ? orderCopy.items : []) as Array<Record<string, unknown>>;
      delete orderCopy._id;
      delete orderCopy.items;

      const orderCols = Object.keys(orderCopy);
      const orderPlaceholders = orderCols.map(() => "?").join(",");
      const orderVals = Object.values(orderCopy).map((v) => {
        if (v === undefined || v === null) return null;
        if (typeof v === "boolean") return v ? 1 : 0;
        if (v instanceof Date) return v.toISOString();
        return v as string | number | bigint | null | Uint8Array;
      });
      db.prepare(`INSERT OR REPLACE INTO pre_orders (${orderCols.join(",")}) VALUES (${orderPlaceholders})`).run(...orderVals);

      const orderId = String(orderCopy.id);
      for (const item of items) {
        const itemCopy: Record<string, any> = { ...(item as Record<string, any>), order_id: orderId };
        delete itemCopy._id;
        const resolvedItem = {
          id: itemCopy.id || `oit_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
          order_id: orderId,
          product_id: itemCopy.productId || itemCopy.product_id || null,
          product_slug: itemCopy.productSlug || itemCopy.product_slug || "",
          product_name: itemCopy.productName || itemCopy.product_name || "",
          category_name: itemCopy.categoryName || itemCopy.category_name || "",
          brand_name: itemCopy.brandName || itemCopy.brand_name || "",
          variant_name: itemCopy.variantName || itemCopy.variant_name || "",
          unit: itemCopy.unit || "piece",
          quantity: Number(itemCopy.quantity || 1),
          unit_price_pkr: itemCopy.unitPricePkr !== undefined ? itemCopy.unitPricePkr : (itemCopy.unit_price_pkr ?? null),
          price_status: itemCopy.priceStatus || itemCopy.price_status || "tbc",
          line_total_pkr: itemCopy.lineTotalPkr !== undefined ? itemCopy.lineTotalPkr : (itemCopy.line_total_pkr ?? null),
          image_path: itemCopy.imagePath || itemCopy.image_path || "",
          snapshot_json: typeof itemCopy.snapshot === "object" ? JSON.stringify(itemCopy.snapshot) : String(itemCopy.snapshot_json || "{}"),
          created_at: String(itemCopy.createdAt || itemCopy.created_at || orderCopy.created_at || new Date().toISOString()),
        };

        const itemCols = Object.keys(resolvedItem);
        const itemPlaceholders = itemCols.map(() => "?").join(",");
        const itemVals = Object.values(resolvedItem).map((v) => {
          if (v === undefined || v === null) return null;
          if (typeof v === "boolean") return v ? 1 : 0;
          return v as string | number | bigint | null | Uint8Array;
        });
        db.prepare(`INSERT OR REPLACE INTO order_items (${itemCols.join(",")}) VALUES (${itemPlaceholders})`).run(...itemVals);
      }
    }
  } catch (err) {
    console.warn("[MongoDB Atlas] Failed to sync all orders:", (err as Error).message);
  }
}
