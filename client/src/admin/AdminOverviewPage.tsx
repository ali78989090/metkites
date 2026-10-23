import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Skeleton, StatusBadge } from "../components/ui";
import { formatDateTime, formatPkr } from "../lib/format";
import { STATUS_LABELS, type OrderStatus } from "../lib/types";

interface Overview {
  total: number;
  counts: Record<string, number>;
  pending: number;
  confirmed: number;
  preparing: number;
  completed: number;
  uniqueCustomers: number;
  activeProducts: number;
  recent: Array<{
    id: string;
    reference: string;
    status: OrderStatus;
    customerName: string;
    phone: string;
    city: string;
    itemsCount: number;
    subtotalPkr: number | null;
    priceStatus: string;
    createdAt: string;
  }>;
}

export function AdminOverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    api<{ overview: Overview }>("/api/admin/overview").then((data) => setOverview(data.overview)).catch(() => setOverview(null));
  }, []);

  const stats = overview
    ? [
        { label: "Total requests", value: overview.total },
        { label: "Pending review", value: overview.pending, accent: true },
        { label: "Confirmed", value: overview.confirmed },
        { label: "In preparation", value: overview.preparing },
        { label: "Delivered", value: overview.completed },
        { label: "Active products", value: overview.activeProducts },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-ink sm:text-3xl">Operations Overview</h1>
        <p className="mt-1 text-sm text-ink/60">Real-time Basant kite festival pre-order activity and key performance indicators.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {overview === null
          ? Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-28 w-full rounded-2xl" />)
          : stats.map((stat) => (
              <div
                key={stat.label}
                className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-xs transition-all hover:shadow-md ${
                  stat.accent
                    ? "border-brand/40 bg-gradient-to-br from-white via-white to-red-50/30"
                    : "border-ink/10 hover:border-ink/20"
                }`}
              >
                {stat.accent && <div className="absolute top-0 inset-x-0 h-1 bg-brand" />}
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink/50">{stat.label}</p>
                <p className={`mt-2 font-display text-3xl font-black ${stat.accent ? "text-brand" : "text-ink"}`}>
                  {stat.value}
                </p>
              </div>
            ))}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-black text-ink">Recent Pre-Orders</h2>
          <Link to="/admin/orders" className="text-sm font-bold text-brand hover:underline">
            View all orders →
          </Link>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-xs">
          {overview === null ? (
            <Skeleton className="m-4 h-40 w-[calc(100%-2rem)]" />
          ) : overview.recent.length === 0 ? (
            <p className="p-8 text-center text-sm text-ink/55">No pre-orders yet.</p>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/8">
                {overview.recent.map((order) => (
                  <tr key={order.id} className="hover:bg-mist/60">
                    <td className="px-4 py-3">
                      <Link to={`/admin/orders/${order.id}`} className="font-semibold text-brand hover:underline">
                        {order.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{order.customerName}</span>
                      <span className="block text-xs text-ink/50">{order.phone}</span>
                    </td>
                    <td className="px-4 py-3">{order.city}</td>
                    <td className="px-4 py-3">{order.itemsCount}</td>
                    <td className="px-4 py-3">
                      {order.subtotalPkr !== null ? formatPkr(order.subtotalPkr) : <span className="text-ink/45">TBC</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} label={STATUS_LABELS[order.status]} />
                    </td>
                    <td className="px-4 py-3 text-xs text-ink/60">{formatDateTime(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
