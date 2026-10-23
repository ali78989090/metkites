import { Router } from "express";
import { z } from "zod";
import { all, get, nowIso, run } from "../../db.js";
import { badRequest, handler, notFound, parseBody, parseQuery } from "../../lib/http.js";
import { findOrderById, rowToOrder, type OrderDto } from "../../lib/serializers.js";
import { ORDER_STATUSES, STATUS_LABELS, STATUS_TRANSITIONS, type OrderStatus } from "../../constants.js";
import { getSetting } from "../../lib/settings.js";
import { logAudit } from "../../lib/audit.js";
import { normalizePhone } from "../../lib/ids.js";

export const adminOrdersRouter = Router();

const listQuery = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum([...ORDER_STATUSES, "all"]).default("all"),
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

interface ListFilters {
  where: string;
  params: Array<string | number>;
}

function buildFilters(query: z.infer<typeof listQuery>): ListFilters {
  const where: string[] = ["1 = 1"];
  const params: Array<string | number> = [];
  if (query.status !== "all") {
    where.push("status = ?");
    params.push(query.status);
  }
  if (query.q) {
    const like = `%${query.q.replace(/[%_]/g, "")}%`;
    where.push(
      "(reference LIKE ? OR LOWER(first_name || ' ' || last_name) LIKE ? OR phone LIKE ? OR phone_normalized LIKE ? OR city LIKE ?)",
    );
    params.push(like.toUpperCase(), like, like, like, like);
  }
  if (query.from) {
    where.push("created_at >= ?");
    params.push(new Date(query.from).toISOString());
  }
  if (query.to) {
    where.push("created_at <= ?");
    params.push(new Date(query.to).toISOString());
  }
  return { where: where.join(" AND "), params };
}

adminOrdersRouter.get(
  "/",
  handler(async (req, res) => {
    try {
      const { syncAllOrdersFromMongo } = await import("../../lib/mongo.js");
      await syncAllOrdersFromMongo();
    } catch {
      /* ignore if offline */
    }
    const query = parseQuery(listQuery, req);
    const { where, params } = buildFilters(query);
    const totalRow = get<{ count: number }>(`SELECT COUNT(*) AS count FROM pre_orders WHERE ${where}`, ...params);
    const total = Number(totalRow?.count ?? 0);
    const rows = all<Parameters<typeof rowToOrder>[0]>(
      `SELECT id, reference, tracking_token, user_id, is_guest, first_name, last_name, phone, phone_normalized, address, city,
         kite_size, kite_type, dor_type, brand_name, order_note, status, subtotal_pkr, price_status,
         items_count, admin_notes, created_at, updated_at, status_updated_at
         FROM pre_orders WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      ...params,
      query.pageSize,
      (query.page - 1) * query.pageSize,
    );
    res.json({
      ok: true,
      items: rows.map((row) => rowToOrder(row, { includePrivate: true })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  }),
);

adminOrdersRouter.get(
  "/export.csv",
  handler((req, res) => {
    const query = parseQuery(listQuery, req);
    const { where, params } = buildFilters(query);
    const rows = all<Record<string, string | number | null>>(
      `SELECT reference, status, created_at, first_name, last_name, phone, city, address, items_count, subtotal_pkr, price_status
         FROM pre_orders WHERE ${where} ORDER BY created_at DESC LIMIT 5000`,
      ...params,
    );
    const header = [
      "Reference",
      "Status",
      "Submitted At",
      "Customer",
      "Phone",
      "City",
      "Address",
      "Items",
      "Subtotal (PKR)",
      "Price Status",
    ];
    const escape = (value: string | number | null): string => {
      const text = value === null ? "" : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const lines = [header.join(",")];
    for (const row of rows) {
      lines.push(
        [
          row.reference,
          STATUS_LABELS[row.status as OrderStatus] ?? row.status,
          row.created_at,
          `${row.first_name} ${row.last_name}`,
          row.phone,
          row.city,
          row.address,
          row.items_count,
          row.subtotal_pkr,
          row.price_status === "ok" ? "confirmed" : "to be confirmed",
        ]
          .map(escape)
          .join(","),
      );
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="pre-orders-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(`\uFEFF${lines.join("\r\n")}`);
  }),
);

adminOrdersRouter.get(
  "/:id",
  handler(async (req, res) => {
    let order = findOrderById(String(req.params.id));
    if (!order) {
      try {
        const { syncOrderFromMongo } = await import("../../lib/mongo.js");
        await syncOrderFromMongo("id", String(req.params.id));
        order = findOrderById(String(req.params.id));
      } catch {
        /* ignore */
      }
    }
    if (!order) throw notFound("Order not found.");
    res.json({ ok: true, order: rowToOrder(order, { includePrivate: true }) });
  }),
);

const patchSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  adminNotes: z.string().trim().max(4000).optional(),
  note: z.string().trim().max(1000).optional(),
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
  phone: z.string().trim().max(30).optional(),
  city: z.string().trim().max(60).optional(),
  address: z.string().trim().max(300).optional(),
  orderNote: z.string().trim().max(1000).optional(),
  subtotalPkr: z.number().int().min(0).nullable().optional(),
  priceStatus: z.enum(["ok", "tbc"]).optional(),
  kiteSize: z.string().trim().max(60).optional(),
  kiteType: z.string().trim().max(60).optional(),
  dorType: z.string().trim().max(60).optional(),
  brandName: z.string().trim().max(60).optional(),
});

adminOrdersRouter.patch(
  "/:id",
  handler(async (req, res) => {
    const body = parseBody(patchSchema, req);
    let order = findOrderById(String(req.params.id));
    if (!order) {
      try {
        const { syncOrderFromMongo } = await import("../../lib/mongo.js");
        await syncOrderFromMongo("id", String(req.params.id));
        order = findOrderById(String(req.params.id));
      } catch {
        /* ignore */
      }
    }
    if (!order) throw notFound("Order not found.");

    const actor = req.user?.email || req.user?.fullName || "staff";
    const now = nowIso();

    // Field-level updates
    if (
      body.firstName !== undefined ||
      body.lastName !== undefined ||
      body.phone !== undefined ||
      body.city !== undefined ||
      body.address !== undefined ||
      body.orderNote !== undefined ||
      body.subtotalPkr !== undefined ||
      body.priceStatus !== undefined ||
      body.kiteSize !== undefined ||
      body.kiteType !== undefined ||
      body.dorType !== undefined ||
      body.brandName !== undefined
    ) {
      const nextPhone = body.phone !== undefined ? body.phone : order.phone;
      const normalized = normalizePhone(nextPhone);
      run(
        `UPDATE pre_orders SET
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          phone = COALESCE(?, phone),
          phone_normalized = ?,
          city = COALESCE(?, city),
          address = COALESCE(?, address),
          order_note = COALESCE(?, order_note),
          subtotal_pkr = ?,
          price_status = COALESCE(?, price_status),
          kite_size = COALESCE(?, kite_size),
          kite_type = COALESCE(?, kite_type),
          dor_type = COALESCE(?, dor_type),
          brand_name = COALESCE(?, brand_name),
          updated_at = ?
         WHERE id = ?`,
        body.firstName ?? null,
        body.lastName ?? null,
        body.phone ?? null,
        normalized,
        body.city ?? null,
        body.address ?? null,
        body.orderNote ?? null,
        body.subtotalPkr !== undefined ? body.subtotalPkr : order.subtotal_pkr,
        body.priceStatus ?? null,
        body.kiteSize ?? null,
        body.kiteType ?? null,
        body.dorType ?? null,
        body.brandName ?? null,
        now,
        order.id,
      );
      logAudit(actor, "edit_order_details", "pre_orders", order.id, {
        reference: order.reference,
        changes: body,
      });
    }

    if (body.adminNotes !== undefined) {
      run("UPDATE pre_orders SET admin_notes = ?, updated_at = ? WHERE id = ?", body.adminNotes, now, order.id);
    }

    if (body.status) {
      const current = order.status as OrderStatus;
      const next = body.status;
      if (next !== current) {
        const allowed = STATUS_TRANSITIONS[current] ?? [];
        if (!allowed.includes(next)) {
          throw badRequest(
            `An order cannot move from "${STATUS_LABELS[current]}" to "${STATUS_LABELS[next]}". Allowed: ${
              allowed.map((s) => STATUS_LABELS[s]).join(", ") || "none"
            }.`,
            [{ path: "status", message: "Invalid status change." }],
          );
        }
        run(
          "UPDATE pre_orders SET status = ?, status_message = ?, status_updated_at = ?, updated_at = ? WHERE id = ?",
          next,
          getSetting(`status_messages.${next}`, ""),
          now,
          now,
          order.id,
        );
        run(
          `INSERT INTO order_status_history (id, order_id, from_status, to_status, note, actor, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          `osh_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
          order.id,
          current,
          next,
          body.note ?? "",
          actor,
          now,
        );
        logAudit(actor, "update_order_status", "pre_orders", order.id, {
          reference: order.reference,
          from: current,
          to: next,
          note: body.note ?? "",
        });
      } else if (body.note) {
        run(
          `INSERT INTO order_status_history (id, order_id, from_status, to_status, note, actor, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          `osh_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
          order.id,
          current,
          current,
          body.note,
          actor,
          now,
        );
      }
    } else if (body.note) {
      run(
        `INSERT INTO order_status_history (id, order_id, from_status, to_status, note, actor, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        `osh_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
        order.id,
        order.status,
        order.status,
        body.note,
        actor,
        now,
      );
      run("UPDATE pre_orders SET updated_at = ? WHERE id = ?", now, order.id);
    }

    const updated = findOrderById(order.id)!;

    try {
      const { mongoUpdate } = await import("../../lib/mongo.js");
      await mongoUpdate(
        "pre_orders",
        { id: order.id },
        {
          status: updated.status,
          status_message: getSetting(`status_messages.${updated.status}`, ""),
          status_updated_at: updated.status_updated_at,
          admin_notes: updated.admin_notes,
          updated_at: updated.updated_at,
          first_name: updated.first_name,
          last_name: updated.last_name,
          phone: updated.phone,
          phone_normalized: updated.phone_normalized,
          address: updated.address,
          city: updated.city,
          subtotal_pkr: updated.subtotal_pkr,
          price_status: updated.price_status,
          kite_size: updated.kite_size,
          kite_type: updated.kite_type,
          dor_type: updated.dor_type,
          brand_name: updated.brand_name,
          order_note: updated.order_note,
        },
      );
    } catch {
      /* ignore if offline */
    }

    res.json({ ok: true, order: rowToOrder(updated, { includePrivate: true }) });
  }),
);

adminOrdersRouter.delete(
  "/:id",
  handler(async (req, res) => {
    const order = findOrderById(String(req.params.id));
    if (!order) throw notFound("Order not found.");
    const actor = req.user?.email || req.user?.fullName || "admin";
    run("DELETE FROM pre_orders WHERE id = ?", order.id);
    try {
      const { mongoDelete } = await import("../../lib/mongo.js");
      await mongoDelete("pre_orders", { id: order.id });
      await mongoDelete("order_items", { order_id: order.id });
    } catch {
      /* ignore */
    }
    logAudit(actor, "delete_order", "pre_orders", order.id, { reference: order.reference });
    res.json({ ok: true, message: `Pre-order ${order.reference} deleted.` });
  }),
);

const contactLogSchema = z.object({
  channel: z.enum(["whatsapp", "call", "sms", "email", "in-person", "other"]).default("whatsapp"),
  direction: z.enum(["outbound", "inbound"]).default("outbound"),
  note: z.string().trim().min(2, "Add a short note.").max(1000),
});

adminOrdersRouter.post(
  "/:id/contact-logs",
  handler((req, res) => {
    const body = parseBody(contactLogSchema, req);
    const order = findOrderById(String(req.params.id));
    if (!order) throw notFound("Order not found.");
    const now = nowIso();
    run(
      `INSERT INTO order_contact_logs (id, order_id, channel, direction, note, staff_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      `ocl_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
      order.id,
      body.channel,
      body.direction,
      body.note,
      req.user?.fullName ?? "staff",
      now,
    );
    const updated = findOrderById(order.id)!;
    res.status(201).json({ ok: true, order: rowToOrder(updated, { includePrivate: true }) });
  }),
);

export type { OrderDto };
