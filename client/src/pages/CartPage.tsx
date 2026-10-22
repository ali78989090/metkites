import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../lib/cart";
import { useSettings } from "../lib/settings";
import { EmptyState } from "../components/ui";
import { QuantityStepper } from "../components/QuantityStepper";
import { ProductImage } from "../components/Logo";
import { formatPkr } from "../lib/format";

export function CartPage() {
  const { lines, setQuantity, remove, clear, count } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const allPriced = lines.length > 0 && lines.every((line) => line.pricePkr !== null);
  const subtotal = lines.reduce((sum, line) => sum + (line.pricePkr ?? 0) * line.quantity, 0);
  const distinctLines = lines.length;

  const handleClear = () => {
    if (window.confirm("Remove every item from your pre-order cart?")) clear();
  };

  if (lines.length === 0) {
    return (
      <div className="container-x py-16">
        <h1 className="font-display text-3xl font-black">Your pre-order cart</h1>
        <div className="mt-6">
          <EmptyState
            title="Your cart is empty"
            description="Browse the catalogue, pick your sizes and add kites to your pre-order — no login needed."
            icon="🪁"
            action={
              <Link to="/shop" className="btn-primary">
                Explore Collection
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink/50">Cart</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Your pre-order cart</h1>
          <p className="mt-1 text-sm text-ink/60">
            {count} item{count === 1 ? "" : "s"} across {distinctLines} line{distinctLines === 1 ? "" : "s"}
          </p>
        </div>
        <button type="button" onClick={handleClear} className="text-sm text-ink/60 transition-colors hover:text-brand">
          Clear cart
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="divide-y divide-ink/5 lg:col-span-2">
          {lines.map((line) => (
            <div key={line.key} className="flex flex-col gap-4 py-6 first:pt-0 sm:flex-row sm:items-center">
              <ProductImage src={line.imagePath} alt={line.productName} className="size-24 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <Link to={`/product/${line.productSlug}`} className="font-display text-base font-semibold hover:text-brand">
                  {line.productName}
                </Link>
                <p className="mt-0.5 text-xs text-ink/50">
                  {line.categoryName} · {line.brandName} · {line.unitLabel}
                </p>
                <p className="mt-1 text-sm">
                  Size / variant: <span className="font-medium">{line.variantName}</span>
                </p>
                <p className="mt-0.5 text-sm text-ink/60">
                  {line.pricePkr !== null ? `${formatPkr(line.pricePkr)} each` : "Price to be confirmed"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <QuantityStepper
                  value={line.quantity}
                  onChange={(next) => setQuantity(line.key, next)}
                  size="sm"
                  label={`${line.productName} quantity`}
                />
                {line.pricePkr !== null && (
                  <p className="min-w-[80px] text-right font-semibold">{formatPkr(line.pricePkr * line.quantity)}</p>
                )}
                <button
                  type="button"
                  onClick={() => remove(line.key)}
                  className="rounded-md p-1.5 text-ink/40 transition-colors hover:text-brand"
                  aria-label={`Remove ${line.productName} from cart`}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          <Link to="/shop" className="mt-6 inline-block text-sm text-ink/60 transition-colors hover:text-brand">
            ← Continue shopping
          </Link>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-xl border border-ink/10 p-6">
            <h2 className="font-display text-lg font-semibold">Order summary</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink/60">Items</dt>
                <dd className="font-medium">{count}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink/60">Subtotal</dt>
                <dd className="font-medium">
                  {allPriced ? formatPkr(subtotal) : "Price to be confirmed"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink/60">Advance payment</dt>
                <dd className="font-medium text-emerald-700">None required</dd>
              </div>
            </dl>

            <div className="my-4 border-t border-ink/5" />

            <p className="text-xs leading-5 text-ink/55">
              This is a pre-order request. Final availability, price and delivery are confirmed by our team before anything is
              dispatched.
            </p>

            <button
              type="button"
              onClick={() => navigate("/checkout")}
              disabled={!settings.preorders.enabled}
              className="mt-5 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue to Pre-Order
            </button>
            {!settings.preorders.enabled && (
              <p className="mt-2 text-xs font-medium text-brand">Pre-orders are currently paused by the store.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
