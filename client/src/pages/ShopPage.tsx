import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { Brand, Category, Product } from "../lib/types";
import { ProductCard } from "../components/ProductCard";
import { EmptyState, Skeleton } from "../components/ui";
import { useToast } from "../components/Toast";
import { cn } from "../lib/format";

type SortKey = "featured" | "name" | "price-asc" | "price-desc" | "newest";

const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "name", label: "Name A–Z" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
];

export function ShopPage() {
  const [params, setParams] = useSearchParams();
  const { push } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [total, setTotal] = useState(0);

  const search = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const brand = params.get("brand") ?? "";
  const sort = (params.get("sort") as SortKey) || "featured";

  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => setSearchInput(search), [search]);

  useEffect(() => {
    api<{ items: Category[] }>("/api/categories").then((data) => setCategories(data.items)).catch(() => undefined);
    api<{ items: Brand[] }>("/api/brands").then((data) => setBrands(data.items)).catch(() => undefined);
  }, []);

  const query = useMemo(() => {
    const next = new URLSearchParams();
    if (search) next.set("q", search);
    if (category) next.set("category", category);
    if (brand) next.set("brand", brand);
    if (sort !== "featured") next.set("sort", sort);
    return next.toString();
  }, [search, category, brand, sort]);

  useEffect(() => {
    let cancelled = false;
    setProducts(null);
    api<{ items: Product[]; total: number }>(`/api/products?limit=48&${query}`)
      .then((data) => {
        if (cancelled) return;
        setProducts(data.items);
        setTotal(data.total);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setProducts([]);
        if (error instanceof ApiError) push(error.message, "error");
      });
    return () => {
      cancelled = true;
    };
  }, [query, push]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const hasFilters = Boolean(search || category || brand);

  return (
    <div className="container-x py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-eyebrow">Catalogue</p>
          <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">
            {category ? (categories.find((item) => item.slug === category)?.name ?? "Products") : "Shop Kites"}
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            {products === null ? "Loading…" : `${total} product${total === 1 ? "" : "s"} available for pre-order`}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <form
            className="flex min-w-56 flex-1 sm:flex-none"
            onSubmit={(event) => {
              event.preventDefault();
              updateParam("q", searchInput.trim());
            }}
            role="search"
          >
            <label htmlFor="shop-search" className="sr-only">
              Search products
            </label>
            <input
              id="shop-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search patang, gudda, dor…"
              className="field-input rounded-r-none"
            />
            <button type="submit" className="btn-dark rounded-l-none px-4">
              Search
            </button>
          </form>

          <div>
            <label htmlFor="shop-sort" className="sr-only">Sort by</label>
            <select id="shop-sort" value={sort} onChange={(event) => updateParam("sort", event.target.value)} className="field-input">
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => updateParam("category", "")}
          className={cn(
            "chip border whitespace-nowrap px-3.5 py-1.5 text-xs font-bold transition-all",
            !category ? "border-brand bg-brand text-white shadow-xs" : "border-ink/15 bg-white text-ink/75 hover:border-ink/40 hover:bg-mist",
          )}
        >
          All
        </button>
        {categories.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => updateParam("category", item.slug === category ? "" : item.slug)}
            className={cn(
              "chip border whitespace-nowrap px-3.5 py-1.5 text-xs font-bold transition-all",
              category === item.slug
                ? "border-brand bg-brand text-white shadow-xs"
                : "border-ink/15 bg-white text-ink/75 hover:border-ink/40 hover:bg-mist",
            )}
          >
            {item.name}
          </button>
        ))}
        {brands.length > 1 && (
          <div className="ml-auto">
            <label htmlFor="brand-filter" className="sr-only">Filter by brand</label>
            <select id="brand-filter" value={brand} onChange={(event) => updateParam("brand", event.target.value)} className="field-input py-1.5 text-xs">
              <option value="">All brands</option>
              {brands.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mt-8">
        {products === null ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="card overflow-hidden">
                <Skeleton className="aspect-[4/3] w-full rounded-none" />
                <div className="space-y-3 p-5">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="No products found"
            description={
              hasFilters
                ? "Try a different search term or clear the filters to see the full catalogue."
                : "The catalogue is being prepared. Please check back shortly."
            }
            icon="🪁"
            action={
              hasFilters ? (
                <button type="button" onClick={() => setParams(new URLSearchParams(), { replace: true })} className="btn-outline">
                  Clear filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
