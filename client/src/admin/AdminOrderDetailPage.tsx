import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useSettings } from "../lib/settings";
import { useToast } from "../components/Toast";
import { Skeleton, StatusBadge, TbcBadge } from "../components/ui";
import { formatDateTime, formatPkr } from "../lib/format";
import { STATUS_LABELS, STATUS_ORDER, type Order, type OrderStatus } from "../lib/types";

/** Mirror of the server-side transition rules (server re-validates every change). */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["dispatched", "cancelled"],
  dispatched: ["delivered"],
  delivered: [],
  cancelled: ["pending"],
};

const CHANNELS = ["whatsapp", "call", "sms", "email", "in-person", "other"] as const;

export function AdminOrderDetailPage() {
  const { id = "" } = useParams();
  const { push } = useToast();
  const { settings } = useSettings();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [nextStatus, setNextStatus] = useState<OrderStatus | "">("");
  const [statusNote, setStatusNote] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const [contactChannel, setContactChannel] = useState<(typeof CHANNELS)[number]>("whatsapp");
  const [contactNote, setContactNote] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api<{ ok: true; order: Order }>(`/api/admin/orders/${id}`)
      .then((data) => {
        setOrder(data.order);
        setAdminNotes(data.order.adminNotes);
      })
      .catch((error) => push(error instanceof ApiError ? error.message : "Could not load the pre-order.", "error"))
      .finally(() => setLoading(false));
  }, [id, push]);

  useEffect(() => {
    load();
  }, [load]);

  const saveStatus = async () => {
    if (!order || !nextStatus) return;
    setSaving(true);
    try {
      const data = await api<{ ok: true; order: Order }>(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        body: { status: nextStatus, note: statusNote.trim() || undefined },
      });
      setOrder(data.order);
      setAdminNotes(data.order.adminNotes);
      setNextStatus("");
      setStatusNote("");
      push(`Status updated to ${STATUS_LABELS[nextStatus]}.`, "success");
    } catch (error) {
      push(error instanceof ApiError ? error.message : "Could not update the status.", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveAdminNotes = async () => {
    if (!order) return;
    setSaving(true);
    try {
      const data = await api<{ ok: true; order: Order }>(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        body: { adminNotes },
      });
      setOrder(data.order);
      setAdminNotes(data.order.adminNotes);
      push("Internal notes saved.", "success");
    } catch (error) {
      push(error instanceof ApiError ? error.message : "Could not save notes.", "error");
    } finally {
      setSaving(false);
    }
  };

  const addContactLog = async () => {
    if (!order || contactNote.trim().length < 2) return;
    setSaving(true);
    try {
      const data = await api<{ ok: true; order: Order }>(`/api/admin/orders/${order.id}/contact-logs`, {
        method: "POST",
        body: { channel: contactChannel, direction: "outbound", note: contactNote.trim() },
      });
      setOrder(data.order);
      setContactNote("");
      push("Contact logged.", "success");
    } catch (error) {
      push(error instanceof ApiError ? error.message : "Could not log contact.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="card p-8 text-center">
        <p className="font-semibold">Pre-order not found.</p>
        <Link to="/admin/orders" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">
          ← Back to pre-orders
        </Link>
      </div>
    );
  }

  const allowed = TRANSITIONS[order.status] ?? [];
  const whatsapp = settings.business.whatsapp.replace(/[^0-9]/g, "");
  const customerPhone = order.customer.phone.replace(/[^0-9]/g, "");
  const message = `Hello ${order.customer.firstName}, this is Metro Lahore Kites regarding your pre-order ${order.reference}.`;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/admin/orders" className="text-sm font-semibold text-ink/55 hover:underline">
            ← Pre-orders
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 font-display text-2xl font-black">
            {order.reference}
            <StatusBadge status={order.status} />
          </h1>
          <p className="mt-1 text-sm text-ink/60">Submitted {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {whatsapp ? (
            <a
              href={`https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-outline text-sm"
            >
              WhatsApp customer
            </a>
          ) : null}
          <a href={`sms:${order.customer.phone}?body=${encodeURIComponent(message)}`} className="btn-outline text-sm">
            SMS
          </a>
          <button type="button" onClick={() => window.print()} className="btn-ghost text-sm">
            Print
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <h2 className="font-display text-lg font-black">Items</h2>
            <ul className="mt-4 divide-y divide-ink/8">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-3">
                    {item.imagePath ? (
                      <img
                        src={item.imagePath}
                        alt=""
                        className="size-12 rounded-lg border border-ink/10 bg-mist object-contain"
                        loading="lazy"
                      />
                    ) : null}
                    <div>
                      <p className="font-semibold">{item.productName}</p>
                      <p className="text-xs text-ink/55">
                        {item.categoryName} · {item.brandName}
                        {item.variantName ? ` · ${item.variantName}` : ""} · {item.quantity} {item.unit}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {item.lineTotalPkr !== null ? (
                      <p className="font-semibold">{formatPkr(item.lineTotalPkr)}</p>
                    ) : (
                      <TbcBadge />
                    )}
                    <p className="text-xs text-ink/50">
                      {item.unitPricePkr !== null ? `${formatPkr(item.unitPricePkr)} each` : "Price on confirmation"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-4">
              <span className="font-semibold">Subtotal</span>
              {order.subtotalPkr !== null ? (
                <span className="font-display text-xl font-black">{formatPkr(order.subtotalPkr)}</span>
              ) : (
                <TbcBadge />
              )}
            </div>
            {order.orderNote ? (
              <p className="mt-4 rounded-lg bg-mist p-3 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink/45">Customer note</span>
                <br />
                {order.orderNote}
              </p>
            ) : null}
          </section>

          <section className="card p-6">
            <h2 className="font-display text-lg font-black">Customer</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink/45">Name</dt>
                <dd className="mt-1 font-semibold">
                  {order.customer.firstName} {order.customer.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink/45">Phone</dt>
                <dd className="mt-1 font-mono">{order.customer.phone}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink/45">Delivery address</dt>
                <dd className="mt-1">
                  {order.customer.address}
                  {order.customer.city ? `, ${order.customer.city}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink/45">Account</dt>
                <dd className="mt-1">{order.isGuest ? "Guest checkout" : "Registered customer"}</dd>
              </div>
            </dl>
          </section>

          <section className="card p-6">
            <h2 className="font-display text-lg font-black">Preferences</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink/45">Preferred kite size</dt>
                <dd className="mt-1">{order.preferences.kiteSize || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink/45">Preferred kite type</dt>
                <dd className="mt-1">{order.preferences.kiteType || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink/45">Preferred dor type</dt>
                <dd className="mt-1">{order.preferences.dorType || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink/45">Brand preference</dt>
                <dd className="mt-1">{order.preferences.brandName || "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="card p-6">
            <h2 className="font-display text-lg font-black">Contact history</h2>
            {order.contactLogs.length === 0 ? (
              <p className="mt-3 text-sm text-ink/55">No contact logged yet.</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm">
                {order.contactLogs.map((log) => (
                  <li key={log.id} className="border-b border-ink/8 pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip bg-mist text-ink/70">{log.channel}</span>
                      <span className="text-xs text-ink/50">
                        {log.direction} · {formatDateTime(log.createdAt)} · {log.staffName}
                      </span>
                    </div>
                    <p className="mt-1">{log.note}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="w-40">
                <label htmlFor="contact-channel" className="field-label">
                  Channel
                </label>
                <select
                  id="contact-channel"
                  className="field-input"
                  value={contactChannel}
                  onChange={(event) => setContactChannel(event.target.value as (typeof CHANNELS)[number])}
                >
                  {CHANNELS.map((channel) => (
                    <option key={channel} value={channel}>
                      {channel}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-56 flex-1">
                <label htmlFor="contact-note" className="field-label">
                  Note
                </label>
                <input
                  id="contact-note"
                  className="field-input"
                  placeholder="e.g. Called customer, confirmed sizes and delivery for Saturday"
                  value={contactNote}
                  onChange={(event) => setContactNote(event.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn-primary"
                disabled={saving || contactNote.trim().length < 2}
                onClick={() => void addContactLog()}
              >
                Log contact
              </button>
            </div>
          </section>

          <section className="card p-6 print:hidden">
            <h2 className="font-display text-lg font-black">Internal notes</h2>
            <p className="mt-1 text-xs text-ink/55">Only visible to staff. Never shown to the customer.</p>
            <textarea
              className="field-input mt-3 min-h-28"
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value)}
              placeholder="Notes about this pre-order…"
            />
            <button
              type="button"
              className="btn-outline mt-3 text-sm"
              disabled={saving || adminNotes === order.adminNotes}
              onClick={() => void saveAdminNotes()}
            >
              Save notes
            </button>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="font-display text-lg font-black">Status</h2>
            <p className="mt-1 text-xs text-ink/55">
              Last updated {formatDateTime(order.statusUpdatedAt)}
            </p>
            {order.statusMessage ? <p className="mt-3 text-sm text-ink/70">“{order.statusMessage}”</p> : null}

            {allowed.length === 0 ? (
              <p className="mt-4 text-sm text-ink/55">
                This pre-order is {STATUS_LABELS[order.status].toLowerCase()} — no further status changes are available.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="next-status" className="field-label">
                    Move to
                  </label>
                  <select
                    id="next-status"
                    className="field-input"
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value as OrderStatus | "")}
                  >
                    <option value="">Select a new status…</option>
                    {STATUS_ORDER.filter((value) => allowed.includes(value)).map((value) => (
                      <option key={value} value={value}>
                        {STATUS_LABELS[value]}
                      </option>
                    ))}
                    {allowed.includes("cancelled") ? (
                      <option value="cancelled">{STATUS_LABELS.cancelled}</option>
                    ) : null}
                  </select>
                </div>
                <div>
                  <label htmlFor="status-note" className="field-label">
                    Note for history (optional)
                  </label>
                  <input
                    id="status-note"
                    className="field-input"
                    placeholder="e.g. Customer confirmed on call"
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn-primary w-full"
                  disabled={saving || !nextStatus}
                  onClick={() => void saveStatus()}
                >
                  {saving ? "Saving…" : "Update status"}
                </button>
              </div>
            )}
          </section>

          <section className="card p-6">
            <h2 className="font-display text-lg font-black">Status history</h2>
            {order.history.length === 0 ? (
              <p className="mt-3 text-sm text-ink/55">No changes yet.</p>
            ) : (
              <ol className="mt-4 space-y-3 text-sm">
                {[...order.history].reverse().map((entry) => (
                  <li key={entry.id} className="border-b border-ink/8 pb-3 last:border-0 last:pb-0">
                    <p className="font-semibold">
                      {entry.fromStatus ? `${STATUS_LABELS[entry.fromStatus as OrderStatus] ?? entry.fromStatus} → ` : ""}
                      {STATUS_LABELS[entry.toStatus as OrderStatus] ?? entry.toStatus}
                    </p>
                    <p className="text-xs text-ink/50">
                      {formatDateTime(entry.createdAt)} · {entry.actor}
                    </p>
                    {entry.note ? <p className="mt-1">{entry.note}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
