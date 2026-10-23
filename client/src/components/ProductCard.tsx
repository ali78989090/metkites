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

          <a
            href={`https://wa.me/923262577880?text=${encodeURIComponent(
              `Salam! I want to order "${product.name}" (${variant?.name ?? "Standard"}, Qty: ${quantity}) from Metro Lahore Kites.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-1.5 px-3 text-xs font-bold text-emerald-700 transition-all duration-200 hover:bg-emerald-600 hover:text-white hover:shadow-xs active:scale-[0.99]"
            title="Order directly via WhatsApp (+923262577880)"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5 shrink-0 text-emerald-600 group-hover:text-white" aria-hidden="true">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span>WhatsApp Order</span>
          </a>
        </div>
      </div>
    </article>
  );
}
