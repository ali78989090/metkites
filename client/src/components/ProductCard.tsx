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
    <article className="group flex flex-col overflow-hidden transition-all duration-200 hover:translate-y-[-2px]">
      <Link to={`/product/${product.slug}`} className="relative block" tabIndex={-1} aria-hidden="true">
        <ProductImage src={product.image} alt={product.images[0]?.alt ?? product.name} className="aspect-[4/3] w-full rounded-lg" />
        <span className="chip absolute left-3 top-3 bg-white/95 text-ink/70 shadow-sm">{product.categoryName}</span>
        {!product.available && (
          <span className="chip absolute right-3 top-3 bg-ink/90 text-white">Currently unavailable</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 pt-4">
        <div>
          <h3 className="font-display text-base font-semibold leading-tight tracking-tight sm:text-lg">
            <Link to={`/product/${product.slug}`} className="transition-colors hover:text-brand">
              {product.name}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-ink/50">
            {product.brandName} · {product.unitLabel}
          </p>
        </div>

        {product.variants.length > 1 ? (
          <div>
            <label htmlFor={`variant-${product.id}`} className="mb-1 block text-xs font-semibold text-ink/60">
              Size / variant
            </label>
            <select
              id={`variant-${product.id}`}
              value={selectedVariantId}
              onChange={(event) => setSelectedVariant(event.target.value)}
              className="field-input py-2 text-sm"
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
          <p className="text-xs font-semibold text-ink/60">
            Size: <span className="text-ink">{product.variants[0]?.name ?? "Standard"}</span>
          </p>
        )}

        <div className="mt-auto">
          {product.priceStatus === "configured" && product.pricePkr !== null ? (
            <p className="font-display text-lg font-bold">
              {formatPkr(product.pricePkr)}{" "}
              <span className="text-xs font-medium text-ink/50">/ {product.unitLabel}</span>
            </p>
          ) : (
            <p className="text-sm text-ink/60">Price to be confirmed</p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <QuantityStepper value={quantity} onChange={setQuantity} size="sm" label={`${product.name} quantity`} />
            <button type="button" onClick={handleAdd} disabled={!canAdd} className="btn-primary flex-1 py-2 text-xs sm:text-sm">
              {inCart ? `Add more (${inCart.quantity} in cart)` : "Add to Pre-Order Cart"}
            </button>
          </div>

          <Link
            to={`/product/${product.slug}`}
            className="mt-2 inline-block text-xs font-semibold text-ink/60 underline-offset-2 hover:text-brand hover:underline"
          >
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}
