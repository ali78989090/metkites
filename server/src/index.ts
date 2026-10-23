import { buildApp } from "./app.js";
import { config } from "./env.js";
import { db } from "./db.js";
import { seedAll } from "./lib/seed.js";
import { initMongo } from "./lib/mongo.js";

void initMongo();

const admin = seedAll();

const app = buildApp();

const server = app.listen(config.port, () => {
  console.log(`Metro Lahore Kites API listening on http://localhost:${config.port}`);
  if (admin.adminCreated && admin.generatedPassword) {
    console.log("--------------------------------------------------------------");
    console.log(`First-run admin account created.`);
    console.log(`  Email:    ${admin.adminEmail}`);
    console.log(`  Password: ${admin.generatedPassword}`);
    console.log("  Sign in at /admin and change this password immediately.");
    console.log("  (Set ADMIN_PASSWORD in .env before first start to choose it yourself.)");
    console.log("--------------------------------------------------------------");
  }
});

function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down.`);
  server.close(() => {
    try {
      db.close();
    } catch {
      /* already closed */
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
