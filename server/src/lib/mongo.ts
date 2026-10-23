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

export async function initMongo(): Promise<typeof mongoose | null> {
  if (config.isTest || !config.mongoUri) {
    return null;
  }
  if (isConnected) return mongoose;
  if (isConnecting) return null;

  isConnecting = true;
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    isConnected = true;
    isConnecting = false;
    console.log("[MongoDB Atlas] Connected successfully to cluster.");

    // Sync any data from MongoDB if SQLite is fresh (e.g. on new Vercel container)
    await restoreSqliteFromMongo();
    return mongoose;
  } catch (error) {
    isConnecting = false;
    console.warn("[MongoDB Atlas] Connection notice:", (error as Error).message);
    return null;
  }
}

/**
 * Restores data from MongoDB Atlas into SQLite if SQLite tables are empty.
 */
export async function restoreSqliteFromMongo(): Promise<void> {
  const mongoDb = mongoose.connection.db;
  if (!mongoDb) return;

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
 * Asynchronously upserts a record to MongoDB Atlas.
 */
export function mongoUpsert(
  collectionName: string,
  doc: Record<string, unknown>,
  keyField = "id",
): void {
  if (config.isTest) return;

  void (async () => {
    try {
      await initMongo();
      const mongoDb = mongoose.connection.db;
      if (!mongoDb) return;

      const keyValue = doc[keyField];
      const filter = keyValue ? { [keyField]: keyValue } : doc;
      await mongoDb.collection(collectionName).updateOne(filter, { $set: doc }, { upsert: true });
    } catch (err) {
      console.warn(`[MongoDB Atlas] Failed to upsert into ${collectionName}:`, (err as Error).message);
    }
  })();
}

/**
 * Asynchronously deletes a record from MongoDB Atlas.
 */
export function mongoDelete(collectionName: string, filter: Record<string, unknown>): void {
  if (config.isTest) return;

  void (async () => {
    try {
      await initMongo();
      const mongoDb = mongoose.connection.db;
      if (!mongoDb) return;

      await mongoDb.collection(collectionName).deleteOne(filter);
    } catch (err) {
      console.warn(`[MongoDB Atlas] Failed to delete from ${collectionName}:`, (err as Error).message);
    }
  })();
}
