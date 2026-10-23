import { useState } from "react";
import { Link } from "react-router-dom";
import type { Product, Variant } from "../lib/types";
import { useCart } from "../lib/cart";
import { useToast } from "./Toast";
import { ProductImage } from "./Logo";
import { QuantityStepper } from "./QuantityStepper";
import { formatPkr } from "../lib/format";

export function ProductCard({ product }: { product: Product }) {
  const { add, lineFor } = useCart();
  const { push } = useToast();
  const [selectedVariantId, setSelectedVariant] = useState<string>(
    product.variants.find((variant) => variant.stockStatus === "available")?.id ?? product.variants[0]?.id ?? "",
  );
  const [quantity, setQuantity] = useState(1);

  const variant: Variant | undefined = product.variants.find((item) => item.id === selectedVariantId);
  const inCart = variant ? lineFor(product, variant) : undefined;
  const canAdd = Boolean(variant) && variant?.stockStatus === "available" && product.available;

  const handleAdd = () => {
    if (!variant) return;
    add(product, variant, quantity);
    push(`${product.name} — ${variant.name} added to your pre-order cart.`, "success");
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white p-3.5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-md">
      <Link to={`/product/${product.slug}`} className="relative block overflow-hidden rounded-xl bg-mist" tabIndex={-1} aria-hidden="true">
        <ProductImage
          src={product.image}
          alt={product.images[0]?.alt ?? product.name}
          className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span
          title={product.categoryName}
          className="absolute left-2.5 top-2.5 max-w-[70%] truncate whitespace-nowrap rounded-full border border-white/80 bg-white/95 px-2.5 py-0.5 text-[11px] font-bold text-ink/85 shadow-xs backdrop-blur-md"
        >
          {product.categoryName}
        </span>
        {!product.available && (
          <span className="chip absolute right-2.5 top-2.5 whitespace-nowrap bg-black/85 text-[11px] font-bold text-white shadow-xs">
            Unavailable
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 pt-3.5">
        <div>
          <h3 className="font-display text-base font-bold leading-tight tracking-tight sm:text-lg min-h-[2.5rem] line-clamp-2">
            <Link to={`/product/${product.slug}`} className="text-ink transition-colors group-hover:text-brand">
              {product.name}
            </Link>
          </h3>
          <p className="mt-1 text-xs font-semibold text-ink/45 truncate">
            {product.brandName} · {product.unitLabel}
          </p>
        </div>

        {product.variants.length > 1 ? (
          <div>
            <label htmlFor={`variant-${product.id}`} className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink/50">
              Size / Variant
            </label>
            <select
              id={`variant-${product.id}`}
              value={selectedVariantId}
              onChange={(event) => setSelectedVariant(event.target.value)}
              className="field-input py-1.5 text-xs font-semibold rounded-lg border-ink/15"
            >
              {product.variants.map((item) => (
                <option key={item.id} value={item.id} disabled={item.stockStatus !== "available"}>
                  {item.name}
                  {item.stockStatus !== "available" ? " — unavailable" : ""}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-xs font-medium text-ink/60">
            Size: <span className="font-bold text-ink">{product.variants[0]?.name ?? "Standard"}</span>
          </p>
        )}

        <div className="mt-auto pt-2 border-t border-ink/6">
          <div className="flex items-baseline justify-between mb-2">
            {product.priceStatus === "configured" && product.pricePkr !== null ? (
              <p className="font-display text-lg font-black text-ink">
                {formatPkr(product.pricePkr)}{" "}
                <span className="text-xs font-semibold text-ink/40">/ {product.unitLabel}</span>
              </p>
            ) : (
              <p className="text-xs font-semibold text-ink/50 italic">Price to be confirmed</p>
            )}
            <Link
              to={`/product/${product.slug}`}
              className="text-xs font-bold text-brand hover:underline"
            >
              Details →
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <QuantityStepper value={quantity} onChange={setQuantity} size="sm" label={`${product.name} quantity`} />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd}
              className="btn-primary flex-1 py-2 text-xs font-bold shadow-xs hover:shadow-brand/20"
            >
              {inCart ? `Add (${inCart.quantity} in cart)` : "Add to Cart"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
