import express from "express";
import cookieParser from "cookie-parser";
import fs from "node:fs";
import path from "node:path";
import { config } from "./env.js";
import { errorMiddleware, notFound } from "./lib/http.js";
import { originCheck, sessionMiddleware } from "./lib/auth.js";
import { publicRouter } from "./routes/public.js";
import { authRouter } from "./routes/auth.js";
import { preorderRouter } from "./routes/preorders.js";
import { adminRouter } from "./routes/admin/index.js";

export function buildApp(): express.Express {
  const app = express();
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    const started = Date.now();
    res.on("finish", () => {
      // Method + path only — no bodies, no customer data in logs.
      if (!config.isTest) console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`);
    });
    next();
  });

  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(originCheck);
  app.use(sessionMiddleware);

  // Admin-uploaded product images.
  app.use(
    "/uploads",
    express.static(config.uploadsDir, {
      maxAge: config.isProduction ? "7d" : 0,
      fallthrough: true,
    }),
  );

  app.use("/api", publicRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/preorders", preorderRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api", (_req, _res, next) => next(notFound("API route not found.")));

  // Production: serve the built client with an SPA fallback.
  const indexHtml = path.join(config.clientDist, "index.html");
  if (fs.existsSync(indexHtml)) {
    app.use(
      express.static(config.clientDist, {
        index: false,
        maxAge: config.isProduction ? "7d" : 0,
      }),
    );
    app.get("*", (req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        next();
        return;
      }
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(indexHtml);
    });
  }

  app.use(errorMiddleware);
  return app;
}
