import { buildApp } from "../server/dist/app.js";
import { seedAll } from "../server/dist/lib/seed.js";
import { initMongo } from "../server/dist/lib/mongo.js";

let bootstrapped = false;
async function ensureBootstrapped() {
  if (!bootstrapped) {
    try {
      await initMongo();
      seedAll();
    } catch (err) {
      console.warn("Bootstrap warning:", err);
    }
    bootstrapped = true;
  }
}

const app = buildApp();

export default async function handler(req, res) {
  await ensureBootstrapped();
  return app(req, res);
}
