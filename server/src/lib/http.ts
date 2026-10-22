import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, type ZodTypeAny, type z } from "zod";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, "bad_request", message, details);
export const unauthorized = (message = "You must be signed in to do that.") =>
  new ApiError(401, "unauthorized", message);
export const forbidden = (message = "You do not have permission to do that.") =>
  new ApiError(403, "forbidden", message);
export const notFound = (message = "Not found.") => new ApiError(404, "not_found", message);
export const conflict = (message: string) => new ApiError(409, "conflict", message);

/** Wraps async handlers so thrown errors reach the error middleware. */
export function handler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown,
): RequestHandler {
  return (req, res, next) => {
    try {
      const result = fn(req, res, next);
      if (result instanceof Promise) result.catch(next);
    } catch (error) {
      next(error);
    }
  };
}

export function parseBody<T extends ZodTypeAny>(schema: T, req: Request): z.infer<T> {
  const result = schema.safeParse(req.body);
  if (!result.success) throw zodError(result.error);
  return result.data;
}

export function parseQuery<T extends ZodTypeAny>(schema: T, req: Request): z.infer<T> {
  const result = schema.safeParse(req.query);
  if (!result.success) throw zodError(result.error);
  return result.data;
}

export function zodError(error: ZodError): ApiError {
  const issues = error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  return new ApiError(400, "validation_error", "Please check the highlighted fields.", issues);
}

/** Uniform JSON error responder + 404 for unknown API routes. */
export function errorMiddleware(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ApiError) {
    res.status(error.status).json({
      ok: false,
      error: { code: error.code, message: error.message, details: error.details ?? undefined },
    });
    return;
  }
  if (error instanceof ZodError) {
    const apiError = zodError(error);
    res.status(apiError.status).json({
      ok: false,
      error: { code: apiError.code, message: apiError.message, details: apiError.details },
    });
    return;
  }
  // Body-parser errors from express.json()
  const anyError = error as { type?: string; status?: number; message?: string; code?: string };
  if (anyError && anyError.type === "entity.too.large") {
    res.status(413).json({ ok: false, error: { code: "payload_too_large", message: "Payload too large." } });
    return;
  }
  if (anyError && anyError.type === "entity.parse.failed") {
    res.status(400).json({ ok: false, error: { code: "bad_request", message: "Invalid JSON payload." } });
    return;
  }
  // Multer errors (LIMIT_FILE_SIZE, LIMIT_UNEXPECTED_FILE, …)
  if (anyError && typeof anyError === "object" && "code" in anyError && String(anyError.code).startsWith("LIMIT_")) {
    if (anyError.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ ok: false, error: { code: "file_too_large", message: "Image must be 5 MB or smaller." } });
    } else {
      res.status(400).json({
        ok: false,
        error: { code: "upload_error", message: "Upload rejected. Send one image file in an allowed format." },
      });
    }
    return;
  }
  console.error("[api] unhandled error:", error);
  res.status(500).json({
    ok: false,
    error: { code: "server_error", message: "Something went wrong on our side. Please try again." },
  });
}
