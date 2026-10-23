import crypto from "node:crypto";
import { run, nowIso } from "../db.js";

export function logAudit(
  actor: string,
  action: string,
  entity: string,
  entityId: string = "",
  details: Record<string, unknown> = {},
): void {
  try {
    const id = `aud_${crypto.randomBytes(6).toString("hex")}`;
    run(
      `INSERT INTO audit_logs (id, actor, action, entity, entity_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      actor || "admin",
      action,
      entity,
      entityId,
      JSON.stringify(details),
      nowIso(),
    );
  } catch (err) {
    console.warn("Audit logging warning:", err);
  }
}
