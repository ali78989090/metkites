import { Router } from "express";
import { z } from "zod";
import { all, get, db } from "../../db.js";
import { badRequest, handler, parseBody, parseQuery } from "../../lib/http.js";

export const adminAuditRouter = Router();

const logsQuery = z.object({
  q: z.string().trim().max(100).optional(),
  entity: z.string().trim().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

adminAuditRouter.get(
  "/logs",
  handler((req, res) => {
    const query = parseQuery(logsQuery, req);
    const where: string[] = ["1 = 1"];
    const params: Array<string | number> = [];

    if (query.entity && query.entity !== "all") {
      where.push("entity = ?");
      params.push(query.entity);
    }

    if (query.q) {
      const like = `%${query.q.replace(/[%_]/g, "")}%`;
      where.push("(actor LIKE ? OR action LIKE ? OR entity LIKE ? OR entity_id LIKE ? OR details LIKE ?)");
      params.push(like, like, like, like, like);
    }

    const whereStr = where.join(" AND ");
    const totalRow = get<{ count: number }>(`SELECT COUNT(*) AS count FROM audit_logs WHERE ${whereStr}`, ...params);
    const rows = all<{
      id: string;
      actor: string;
      action: string;
      entity: string;
      entity_id: string;
      details: string;
      created_at: string;
    }>(
      `SELECT id, actor, action, entity, entity_id, details, created_at
         FROM audit_logs
        WHERE ${whereStr}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`,
      ...params,
      query.pageSize,
      (query.page - 1) * query.pageSize,
    );

    res.json({
      ok: true,
      total: Number(totalRow?.count ?? 0),
      page: query.page,
      pageSize: query.pageSize,
      items: rows.map((r) => {
        let parsedDetails: unknown = {};
        try {
          parsedDetails = JSON.parse(r.details || "{}");
        } catch {
          parsedDetails = r.details;
        }
        return {
          id: r.id,
          actor: r.actor,
          action: r.action,
          entity: r.entity,
          entityId: r.entity_id,
          details: parsedDetails,
          createdAt: r.created_at,
        };
      }),
    });
  }),
);

adminAuditRouter.get(
  "/tables",
  handler((_req, res) => {
    const tables = all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );

    const tableSummaries = tables.map((t) => {
      const countRow = get<{ count: number }>(`SELECT COUNT(*) AS count FROM "${t.name}"`);
      const columns = all<{ cid: number; name: string; type: string; notnull: number; dflt_value: unknown; pk: number }>(
        `PRAGMA table_info("${t.name}")`,
      );
      return {
        name: t.name,
        rowCount: Number(countRow?.count ?? 0),
        columns: columns.map((c) => ({
          name: c.name,
          type: c.type || "ANY",
          isNullable: c.notnull === 0,
          isPrimary: c.pk > 0,
          defaultValue: c.dflt_value,
        })),
      };
    });

    res.json({ ok: true, tables: tableSummaries });
  }),
);

const tableDataQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
});

adminAuditRouter.get(
  "/tables/:tableName",
  handler((req, res) => {
    const tableName = String(req.params.tableName);
    // Sanitize table name against sqlite_master
    const valid = get<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ? AND name NOT LIKE 'sqlite_%'",
      tableName,
    );
    if (!valid) throw badRequest("Invalid or non-existent table name.");

    const query = parseQuery(tableDataQuery, req);
    const columns = all<{ name: string }>(`PRAGMA table_info("${tableName}")`);
    const totalRow = get<{ count: number }>(`SELECT COUNT(*) AS count FROM "${tableName}"`);

    const rows = all<Record<string, unknown>>(
      `SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`,
      query.pageSize,
      (query.page - 1) * query.pageSize,
    );

    res.json({
      ok: true,
      tableName,
      columns: columns.map((c) => c.name),
      total: Number(totalRow?.count ?? 0),
      page: query.page,
      pageSize: query.pageSize,
      rows,
    });
  }),
);

const sqlQuerySchema = z.object({
  sql: z.string().trim().min(6).max(2000),
});

// Forbidden keywords for read-only query execution
const FORBIDDEN_SQL = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|REPLACE|ATTACH|DETACH|VACUUM|REINDEX)\b/i;

adminAuditRouter.post(
  "/query",
  handler((req, res) => {
    const body = parseBody(sqlQuerySchema, req);
    const cleanSql = body.sql.trim();

    // Must be SELECT or EXPLAIN or PRAGMA table_info
    if (!/^(SELECT|EXPLAIN|PRAGMA\s+table_info)\b/i.test(cleanSql)) {
      throw badRequest("Only read-only SELECT or EXPLAIN queries are permitted.");
    }

    if (FORBIDDEN_SQL.test(cleanSql)) {
      throw badRequest("Data mutation queries are forbidden in the query auditor.");
    }

    const start = Date.now();
    try {
      const rows = all<Record<string, unknown>>(cleanSql);
      const executionTimeMs = Date.now() - start;
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      res.json({
        ok: true,
        executionTimeMs,
        rowCount: rows.length,
        columns,
        rows: rows.slice(0, 200), // Cap output at 200 rows for response safety
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw badRequest(`SQL Execution Error: ${msg}`);
    }
  }),
);
