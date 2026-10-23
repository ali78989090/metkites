import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import { db } from "../db.js";

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://ali78989090_db_user:vWSRCV5sTlKOt9lu@cluster0.av2ofo2.mongodb.net/metrolahorekites?retryWrites=true&w=majority";

const TABLES = [
  "users",
  "categories",
  "brands",
  "products",
  "product_variants",
  "product_images",
  "pre_orders",
  "order_items",
  "order_status_history",
  "order_contact_logs",
  "settings",
  "audit_logs",
];

async function migrate() {
  console.log("=== Migrating SQLite Data to MongoDB Atlas ===");
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB Atlas!\n");

  const mongoDb = mongoose.connection.db;
  if (!mongoDb) {
    throw new Error("Could not access MongoDB database object.");
  }

  for (const tableName of TABLES) {
    try {
      const rows = db.prepare(`SELECT * FROM ${tableName}`).all() as Record<string, unknown>[];
      console.log(`Table '${tableName}': ${rows.length} rows found in SQLite.`);

      if (rows.length > 0) {
        const collection = mongoDb.collection(tableName);
        
        // Use bulkWrite upsert by 'id' or 'key' to allow re-running cleanly
        const operations = rows.map((row) => {
          const filterKey = row.id ? { id: row.id } : row.key ? { key: row.key } : { _sqlite_row: JSON.stringify(row) };
          return {
            updateOne: {
              filter: filterKey,
              update: { $set: row },
              upsert: true,
            },
          };
        });

        const result = await collection.bulkWrite(operations);
        console.log(
          `  -> MongoDB '${tableName}': ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`
        );
      }
    } catch (err) {
      console.error(`Error migrating table ${tableName}:`, err);
    }
  }

  console.log("\nVerifying migrated collections in MongoDB Atlas:");
  const collections = await mongoDb.listCollections().toArray();
  for (const col of collections) {
    const count = await mongoDb.collection(col.name).countDocuments();
    console.log(`  - ${col.name}: ${count} documents`);
  }

  await mongoose.disconnect();
  console.log("\n=== Migration completed successfully! ===");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
