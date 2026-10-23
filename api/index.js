import { buildApp } from "../server/dist/app.js";
import { seedAll } from "../server/dist/lib/seed.js";
import { initMongo } from "../server/dist/lib/mongo.js";

let bootstrapped = false;
function ensureBootstrapped() {
  if (!bootstrapped) {
    try {
      void initMongo();
      seedAll();
    } catch (err) {
      console.warn("Bootstrap warning:", err);
    }
    bootstrapped = true;
  }
}

const app = buildApp();

export default function handler(req, res) {
  ensureBootstrapped();
  return app(req, res);
}
