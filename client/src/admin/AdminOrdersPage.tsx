import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useSettings } from "../lib/settings";
import { useToast } from "../components/Toast";
import { EmptyState, Skeleton, Spinner, StatusBadge, TbcBadge } from "../components/ui";
import { formatDateTime, formatPkr } from "../lib/format";
import { STATUS_LABELS, STATUS_ORDER, type Order } from "../lib/types";

const PAGE_SIZE = 20;

function whatsappHref(number: string, message: string): string {
  return `https://wa.me/${number.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`;
}

export function AdminOrdersPage() {
  const { push } = useToast();
  const { settings } = useSettings();
  const [params, setParams] = useSearchParams();

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const q = params.get("q") ?? "";
  const status = params.get("status") ?? "all";
  const page = Number(params.get("page") ?? "1") || 1;

  const updateParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (q) query.set("q", q);
    if (status && status !== "all") query.set("status", status);
    api<{ ok: true; items: Order[]; total: number }>(`/api/admin/orders?${query.toString()}`)
      .then((data) => {
        if (cancelled) return;
        setOrders(data.items);
        setTotal(data.total);
      })
      .catch((error) => {
        if (!cancelled) push(error instanceof ApiError ? error.message : "Could not load pre-orders.", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q, status, page, push]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const exportCsv = () => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (status && status !== "all") query.set("status", status);
    api<string>(`/api/admin/orders/export.csv?${query.toString()}`)
      .then((csv) => {
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `pre-orders-${new Date().toISOString().slice(0, 10)}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
      })
      .catch((error) => push(error instanceof ApiError ? error.message : "Export failed.", "error"));
  };

  const whatsapp = settings.business.whatsapp.replace(/[^0-9]/g, "");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black">Pre-Orders</h1>
          <p className="mt-1 text-sm text-ink/60">
            {loading ? "Loading…" : `${total} pre-order${total === 1 ? "" : "s"}`}
          </p>
        </div>
        <button type="button" onClick={exportCsv} className="btn-outline text-sm">
          Export CSV
        </button>
      </div>

      <div className="card mt-6 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-56 flex-1">
          <label htmlFor="orders-search" className="field-label">
            Search
          </label>
          <input
            id="orders-search"
            type="search"
            className="field-input"
            placeholder="Reference, customer name, phone or city…"
            defaultValue={q}
            onKeyDown={(event) => {
              if (event.key === "Enter") updateParam("q", (event.target as HTMLInputElement).value.trim());
            }}
            onBlur={(event) => updateParam("q", event.target.value.trim())}
          />
        </div>
        <div className="w-52">
          <label htmlFor="orders-status" className="field-label">
            Status
          </label>
          <select
            id="orders-status"
            className="field-input"
            value={status}
            onChange={(event) => updateParam("status", event.target.value)}
          >
            <option value="all">All statuses</option>
            {STATUS_ORDER.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
            <option value="cancelled">{STATUS_LABELS.cancelled}</option>
          </select>
        </div>
        {q || status !== "all" ? (
          <button type="button" className="btn-ghost text-sm" onClick={() => setParams({}, { replace: true })}>
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="card mt-4 overflow-x-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="No pre-orders found"
            description={q || status !== "all" ? "Try clearing your filters." : "Submitted pre-orders will appear here."}
          />
        ) : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-ink/10 bg-white text-left text-xs uppercase tracking-wider text-ink/45">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/8">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-mist/60">
                  <td className="px-4 py-3">
                    <Link to={`/admin/orders/${order.id}`} className="font-semibold text-brand hover:underline">
                      {order.reference}
                    </Link>
                    {order.isGuest ? <span className="block text-xs text-ink/45">Guest</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold">
                      {order.customer.firstName} {order.customer.lastName}
                    </span>
                    <span className="block font-mono text-xs text-ink/50">{order.customer.phone}</span>
                  </td>
                  <td className="px-4 py-3">{order.customer.city}</td>
                  <td className="px-4 py-3">{order.itemsCount}</td>
                  <td className="px-4 py-3">
                    {order.subtotalPkr !== null ? formatPkr(order.subtotalPkr) : <TbcBadge />}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/60">{formatDateTime(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/orders/${order.id}`} className="btn-outline px-2.5 py-1 text-xs">
                        View
                      </Link>
                      {whatsapp ? (
                        <a
                          href={whatsappHref(
                            order.customer.phone,
                            `Hello ${order.customer.firstName}, this is Metro Lahore Kites regarding your pre-order ${order.reference}.`,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ghost px-2.5 py-1 text-xs"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            className="btn-outline text-sm"
            disabled={page <= 1}
            onClick={() => updateParam("page", String(page - 1))}
          >
            ← Previous
          </button>
          <span className="text-sm text-ink/60">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn-outline text-sm"
            disabled={page >= totalPages}
            onClick={() => updateParam("page", String(page + 1))}
          >
            Next →
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 flex justify-center">
          <Spinner className="size-5 text-brand" />
        </div>
      ) : null}
    </div>
  );
}
