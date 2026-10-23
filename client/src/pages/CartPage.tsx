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
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/shop" className="btn-primary">
                  Explore Collection
                </Link>
                <a
                  href="https://wa.me/923262577880?text=Salam!%20I%20need%20assistance%20with%20Metro%20Lahore%20Kites%20pre-orders."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline flex items-center gap-2 border-emerald-500/30 text-emerald-700 hover:bg-emerald-50 text-xs font-bold"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-4 shrink-0 text-emerald-600" aria-hidden="true">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  <span>WhatsApp: +92 326 2577880</span>
                </a>
              </div>
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
              className="mt-5 w-full rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-md shadow-rose-600/25 transition-all hover:bg-brand-dark hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
            >
              Continue to Pre-Order
            </button>
            {!settings.preorders.enabled && (
              <p className="mt-2 text-xs font-medium text-brand">Pre-orders are currently paused by the store.</p>
            )}

            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ink/10" />
              </div>
              <span className="relative bg-white px-2.5 text-[10px] font-bold uppercase tracking-wider text-ink/40">
                Or Instant Assistance
              </span>
            </div>

            <a
              href={`https://wa.me/923262577880?text=${encodeURIComponent(
                `Salam! I am viewing my Metro Lahore Kites pre-order cart with ${count} item${count === 1 ? "" : "s"}${
                  allPriced ? ` (Subtotal: ${formatPkr(subtotal)})` : ""
                }. Please confirm my order directly via WhatsApp.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-5 shrink-0" aria-hidden="true">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              <span>Order via WhatsApp (+92 326 2577880)</span>
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
