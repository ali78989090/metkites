import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useToast } from "../components/Toast";
import { EmptyState, Skeleton, Spinner, StatusBadge } from "../components/ui";
import { formatDateTime, formatPkr } from "../lib/format";
import { STATUS_LABELS, type OrderStatus } from "../lib/types";

interface CustomerRow {
  phone: string;
  firstName: string;
  lastName: string;
  city: string;
  orderCount: number;
  lastOrderAt: string;
  lastStatus: OrderStatus;
  registered: boolean;
  totalPkr: number;
}

const PAGE_SIZE = 25;

export function AdminCustomersPage() {
  const { push } = useToast();
  const [params, setParams] = useSearchParams();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const q = params.get("q") ?? "";
  const page = Number(params.get("page") ?? "1") || 1;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (q) query.set("q", q);
    api<{ ok: true; items: CustomerRow[]; total: number }>(`/api/admin/customers?${query.toString()}`)
      .then((data) => {
        if (cancelled) return;
        setCustomers(data.items);
        setTotal(data.total);
      })
      .catch((error) => {
        if (!cancelled) push(error instanceof ApiError ? error.message : "Could not load customers.", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q, page, push]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const exportCsv = () => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    api<string>(`/api/admin/customers/export.csv?${query.toString()}`)
      .then((csv) => {
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
      })
      .catch((error) => push(error instanceof ApiError ? error.message : "Export failed.", "error"));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black">Customers</h1>
          <p className="mt-1 text-sm text-ink/60">
            {loading ? "Loading…" : `${total} customer${total === 1 ? "" : "s"} with pre-orders`}
          </p>
        </div>
        <button type="button" onClick={exportCsv} className="btn-outline text-sm">
          Export CSV
        </button>
      </div>

      <div className="card mt-6 p-4">
        <label htmlFor="customers-search" className="field-label">
          Search
        </label>
        <input
          id="customers-search"
          type="search"
          className="field-input"
          placeholder="Search by name, phone or city…"
          defaultValue={q}
          onBlur={(event) => updateParam("q", event.target.value.trim())}
          onKeyDown={(event) => {
            if (event.key === "Enter") updateParam("q", (event.target as HTMLInputElement).value.trim());
          }}
        />
      </div>

      <div className="card mt-4 overflow-x-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            title="No customers found"
            description={q ? "Try a different search." : "Customers appear here after their first pre-order."}
          />
        ) : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-ink/10 bg-white text-left text-xs uppercase tracking-wider text-ink/45">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Total ordered</th>
                <th className="px-4 py-3">Last status</th>
                <th className="px-4 py-3">Last order</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/8">
              {customers.map((customer) => (
                <tr key={customer.phone} className="hover:bg-mist/60">
                  <td className="px-4 py-3">
                    <span className="font-semibold">
                      {customer.firstName} {customer.lastName}
                    </span>
                    {customer.registered ? <span className="ml-2 chip bg-mist text-[10px] text-ink/60">account</span> : null}
                  </td>
                  <td className="px-4 py-3 font-mono">{customer.phone}</td>
                  <td className="px-4 py-3">{customer.city}</td>
                  <td className="px-4 py-3">{customer.orderCount}</td>
                  <td className="px-4 py-3">{customer.totalPkr > 0 ? formatPkr(customer.totalPkr) : "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={customer.lastStatus} label={STATUS_LABELS[customer.lastStatus] ?? customer.lastStatus} />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/60">{formatDateTime(customer.lastOrderAt)}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/orders?q=${encodeURIComponent(customer.phone)}`}
                      className="btn-outline px-2.5 py-1 text-xs"
                    >
                      View orders
                    </Link>
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
