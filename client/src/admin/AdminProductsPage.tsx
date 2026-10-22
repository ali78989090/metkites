import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useToast } from "../components/Toast";
import { EmptyState, Skeleton, Spinner, TbcBadge } from "../components/ui";
import { cn, formatPkr } from "../lib/format";
import type { Product } from "../lib/types";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-900",
  inactive: "bg-amber-100 text-amber-800",
  archived: "bg-ink/10 text-ink/60",
};

export function AdminProductsPage() {
  const { push } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(
    (search: string) => {
      setLoading(true);
      const query = new URLSearchParams({ includeArchived: "1" });
      if (search) query.set("q", search);
      api<{ ok: true; items: Product[] }>(`/api/admin/products?${query.toString()}`)
        .then((data) => setProducts(data.items))
        .catch((error) => push(error instanceof ApiError ? error.message : "Could not load products.", "error"))
        .finally(() => setLoading(false));
    },
    [push],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => load(q), q ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [q, load]);

  const setStatus = async (product: Product, status: Product["status"]) => {
    setWorking(product.id);
    try {
      await api(`/api/admin/products/${product.id}`, { method: "PATCH", body: { status } });
      push(status === "archived" ? `${product.name} archived.` : `${product.name} restored.`, "success");
      load(q);
    } catch (error) {
      push(error instanceof ApiError ? error.message : "Could not update the product.", "error");
    } finally {
      setWorking(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black">Products</h1>
          <p className="mt-1 text-sm text-ink/60">{loading ? "Loading…" : `${products.length} products`}</p>
        </div>
        <Link to="/admin/products/new" className="btn-primary text-sm">
          Add product
        </Link>
      </div>

      <div className="card mt-6 p-4">
        <label htmlFor="products-search" className="field-label">
          Search
        </label>
        <input
          id="products-search"
          type="search"
          className="field-input"
          placeholder="Search by name, slug, category or brand…"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
      </div>

      <div className="card mt-4 overflow-x-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="No products found"
            description={q ? "Try a different search." : "Add your first product to start building the catalogue."}
            action={
              <Link to="/admin/products/new" className="btn-primary text-sm">
                Add product
              </Link>
            }
          />
        ) : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-ink/10 bg-white text-left text-xs uppercase tracking-wider text-ink/45">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Variants</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/8">
              {products.map((product) => {
                const prices = product.variants.map((variant) => variant.pricePkr).filter((value): value is number => value !== null);
                const minPrice = prices.length > 0 ? Math.min(...prices) : null;
                return (
                  <tr key={product.id} className="hover:bg-mist/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt=""
                            className="size-12 shrink-0 rounded-lg border border-ink/10 bg-mist object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-mist text-lg opacity-40">
                            🪁
                          </span>
                        )}
                        <div>
                          <p className="font-semibold">{product.name}</p>
                          <p className="font-mono text-xs text-ink/45">/product/{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{product.categoryName}</td>
                    <td className="px-4 py-3">{product.brandName}</td>
                    <td className="px-4 py-3">{product.variants.length}</td>
                    <td className="px-4 py-3">
                      {minPrice !== null ? formatPkr(minPrice) : <TbcBadge />}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("chip", STATUS_STYLES[product.status] ?? "bg-mist text-ink/60")}>
                        {product.status}
                      </span>
                      {product.preorderOnly ? <span className="mt-1 block text-xs text-ink/45">Pre-order only</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/products/${product.id}`} className="btn-outline px-2.5 py-1 text-xs">
                          Edit
                        </Link>
                        {product.status !== "archived" ? (
                          <button
                            type="button"
                            className="btn-ghost px-2.5 py-1 text-xs"
                            disabled={working === product.id}
                            onClick={() => void setStatus(product, "archived")}
                          >
                            Archive
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-ghost px-2.5 py-1 text-xs"
                            disabled={working === product.id}
                            onClick={() => void setStatus(product, "active")}
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {loading ? (
        <div className="mt-4 flex justify-center">
          <Spinner className="size-5 text-brand" />
        </div>
      ) : null}
    </div>
  );
}
