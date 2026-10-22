import { useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { Field, Input, Spinner, StatusBadge } from "../components/ui";
import { useToast } from "../components/Toast";
import { formatDate, formatDateTime } from "../lib/format";
import type { TrackingOrder } from "../lib/types";

export function TrackPage() {
  const [reference, setReference] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrors({});
    setOrder(null);
    try {
      const data = await api<{ order: TrackingOrder }>("/api/track", {
        method: "POST",
        body: { reference: reference.trim().toUpperCase(), phone: phone.trim() },
      });
      setOrder(data.order);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({ reference: error.message });
        push(error.message, "error");
      } else {
        push("Could not reach the server. Please try again.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-x max-w-3xl py-12">
      <p className="section-eyebrow">Order tracking</p>
      <h1 className="mt-2 font-display text-3xl font-black">Track your pre-order</h1>
      <p className="mt-2 text-sm text-ink/65">
        Enter your pre-order reference number and the mobile / WhatsApp number you used. We only show the order status —
        personal details stay private.
      </p>

      <form onSubmit={handleSubmit} noValidate className="card mt-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pre-order reference" htmlFor="reference" required error={errors.reference}>
            <Input
              id="reference"
              value={reference}
              placeholder="MLK-YYMMDD-XXXXXX"
              onChange={(event) => setReference(event.target.value.toUpperCase())}
              invalid={Boolean(errors.reference)}
            />
          </Field>
          <Field label="Mobile / WhatsApp number" htmlFor="phone" required hint="The number used on the pre-order">
            <Input id="phone" type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </Field>
        </div>
        <button type="submit" disabled={loading} className="btn-primary mt-5 px-6">
          {loading ? <Spinner /> : "Track order"}
        </button>
      </form>

      {order && (
        <div className="card mt-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ink/45">Reference</p>
              <p className="font-display text-xl font-black">{order.reference}</p>
            </div>
            <StatusBadge status={order.status} label={order.statusLabel} />
          </div>

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-ink/55">Submitted</dt>
              <dd className="mt-0.5 font-semibold">{formatDate(order.submittedAt)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink/55">Last update</dt>
              <dd className="mt-0.5 font-semibold">{formatDateTime(order.statusUpdatedAt)}</dd>
            </div>
          </dl>

          {order.statusMessage && (
            <p className="mt-5 rounded-xl border border-ink/10 bg-mist/70 p-4 text-sm leading-6 text-ink/75">
              {order.statusMessage}
            </p>
          )}

          <h2 className="mt-6 font-display text-base font-black">Items</h2>
          <ul className="mt-2 divide-y divide-ink/8 rounded-xl border border-ink/10">
            {order.items.map((item, index) => (
              <li key={index} className="flex justify-between px-4 py-3 text-sm">
                <span>
                  <span className="font-semibold">{item.productName}</span>
                  <span className="block text-xs text-ink/55">{item.variantName}</span>
                </span>
                <span className="text-ink/70">
                  {item.quantity} × {item.unit}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink/50">
            Need help? Contact Metro Lahore Kites and quote your reference number.
          </p>
        </div>
      )}
    </div>
  );
}
