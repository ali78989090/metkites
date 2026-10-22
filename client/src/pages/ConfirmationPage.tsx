import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useCart } from "../lib/cart";
import { useSettings } from "../lib/settings";
import { StatusBadge, Skeleton } from "../components/ui";
import { formatDate, formatDateTime } from "../lib/format";
import type { TrackingOrder } from "../lib/types";

export function ConfirmationPage() {
  const { reference = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [failed, setFailed] = useState(false);
  const { clear } = useCart();
  const { settings } = useSettings();

  useEffect(() => {
    // The cart is cleared only after the backend confirmed the order exists.
    api<{ order: TrackingOrder }>(`/api/track?ref=${encodeURIComponent(reference)}&token=${encodeURIComponent(token)}`)
      .then((data) => {
        setOrder(data.order);
        clear();
      })
      .catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, token]);

  if (failed) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="font-display text-3xl font-black">We could not load your pre-order</h1>
        <p className="mt-3 text-ink/60">
          Your submission may still have been recorded. Please use the track page with your reference number, or contact us
          on WhatsApp.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/track" className="btn-primary">Track my pre-order</Link>
          <Link to="/shop" className="btn-outline">Back to shop</Link>
        </div>
      </div>
    );
  }

  const whatsappUrl =
    settings.business.whatsapp && order
      ? `https://wa.me/${settings.business.whatsapp}?text=${encodeURIComponent(
          `Assalam o Alaikum Metro Lahore Kites! I have submitted pre-order ${order.reference} (${order.itemCount} item${
            order.itemCount === 1 ? "" : "s"
          }). Please review and confirm availability, final price and delivery.`,
        )}`
      : null;

  return (
    <div className="container-x max-w-3xl py-12">
      <div className="card overflow-hidden">
        <div className="bg-emerald-600 px-6 py-8 text-center text-white sm:px-10">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-white/15 text-2xl" aria-hidden="true">✓</div>
          <h1 className="mt-4 font-display text-2xl font-black sm:text-3xl">Pre-order received</h1>
          <p className="mt-2 text-sm text-white/85">
            Your request is saved with Metro Lahore Kites. No advance payment has been collected.
          </p>
          {order ? (
            <p className="mt-5 inline-block rounded-xl bg-white px-5 py-2.5 font-display text-xl font-black text-ink">
              {order.reference}
            </p>
          ) : (
            <Skeleton className="mx-auto mt-5 h-11 w-56 bg-white/30" />
          )}
        </div>

        <div className="px-6 py-8 sm:px-10">
          {!order ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink/45">Current status</p>
                  <div className="mt-1.5"><StatusBadge status={order.status} label={order.statusLabel} /></div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink/45">Submitted</p>
                  <p className="mt-1.5 text-sm font-semibold">{formatDateTime(order.submittedAt)}</p>
                </div>
              </div>

              {order.statusMessage && (
                <p className="mt-5 rounded-xl border border-ink/10 bg-mist/70 p-4 text-sm leading-6 text-ink/75">
                  {order.statusMessage}
                </p>
              )}

              <h2 className="mt-8 font-display text-lg font-black">What happens next</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-ink/75">
                <li>Our team reviews your items and confirms availability.</li>
                <li>We contact you on WhatsApp or call to confirm the final price and delivery arrangement.</li>
                <li>You pay only when your order is confirmed — never in advance through this website.</li>
              </ol>

              <h2 className="mt-8 font-display text-lg font-black">Order summary</h2>
              <ul className="mt-3 divide-y divide-ink/8 rounded-xl border border-ink/10">
                {order.items.map((item, index) => (
                  <li key={index} className="flex justify-between gap-3 px-4 py-3 text-sm">
                    <span>
                      <span className="font-semibold">{item.productName}</span>
                      <span className="block text-xs text-ink/55">{item.variantName} · {item.quantity} × {item.unit.replace("piece", "pc")}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-xs text-ink/55">
                Submitted on {formatDate(order.submittedAt)}. Keep this reference number safe — you can check progress any
                time on the <Link to="/track" className="font-semibold text-brand hover:underline">Track Order</Link> page.
              </p>

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary mt-6 inline-flex bg-emerald-600 hover:bg-emerald-700"
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
                    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.5 14c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6 0-1.3.7-1.9 1-2.2.2-.2.5-.3.7-.3h.5c.2 0 .4-.1.6.4l.8 2c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.5 1.9 1 .9 1.9 1.2 2.2 1.3.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l2 1c.2.1.4.2.4.3.1.1.1.6-.1 1.1Z" />
                  </svg>
                  Message us on WhatsApp about this order
                </a>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/shop" className="btn-outline">Continue shopping</Link>
                <Link to="/account" className="btn-ghost">View my orders</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
