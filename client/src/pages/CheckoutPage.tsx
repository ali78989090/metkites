import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useCart } from "../lib/cart";
import { useSettings } from "../lib/settings";
import { useToast } from "../components/Toast";
import { Field, Input, Select, Textarea } from "../components/ui";
import { QuantityStepper } from "../components/QuantityStepper";
import { formatPkr, makeIdempotencyKey } from "../lib/format";
import type { PreorderSubmissionResult, Product } from "../lib/types";

const DRAFT_KEY = "mlk_checkout_draft_v1";

interface Draft {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  kiteSize: string;
  kiteType: string;
  dorType: string;
  brandName: string;
  note: string;
}

const EMPTY_DRAFT: Draft = {
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
  city: "Lahore",
  kiteSize: "",
  kiteType: "",
  dorType: "",
  brandName: "Metro Lahore Kites",
  note: "",
};

function readDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    return { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<Draft>) };
  } catch {
    return EMPTY_DRAFT;
  }
}

export function CheckoutPage() {
  const { lines, setQuantity, remove, add } = useCart();
  const { settings } = useSettings();
  const { push } = useToast();
  const navigate = useNavigate();

  const [draft, setDraft] = useState<Draft>(() => readDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [brandChoices, setBrandChoices] = useState<Record<string, string>>({});
  const [catalog, setCatalog] = useState<Product[]>([]);

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft]);

  useEffect(() => {
    // Load the catalogue so per-line size/brand dropdowns are populated from it.
    api<{ items: Product[] }>("/api/products?limit=60")
      .then((data) => setCatalog(data.items))
      .catch(() => undefined);
  }, []);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const totalPkr = lines.reduce((sum, line) => sum + (line.pricePkr ?? 0) * line.quantity, 0);
  const allPriced = lines.length > 0 && lines.every((line) => line.pricePkr !== null);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  const hasKiteLines = useMemo(
    () => lines.some((line) => /patang|gudda/i.test(line.categoryName)),
    [lines],
  );
  const hasDorLines = useMemo(() => lines.some((line) => /dor|pinna/i.test(line.categoryName)), [lines]);

  const brands = useMemo(() => {
    const list = ["Metro Lahore Kites", "Other / Custom Brand"];
    for (const product of catalog) {
      if (!list.includes(product.brandName)) list.push(product.brandName);
    }
    return list;
  }, [catalog]);

  const kiteSizeOptions = useMemo(
    () => Array.from(new Set([...settings.options.kiteSizes, ...settings.options.guddaSizes, "Mixed / see item list"])),
    [settings.options],
  );

  if (lines.length === 0) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="font-display text-3xl font-black">Your cart is empty</h1>
        <p className="mt-3 text-ink/60">Add some kites before starting a pre-order.</p>
        <Link to="/shop" className="btn-primary mt-6">Explore Collection</Link>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    if (!acceptedTerms) {
      setErrors((current) => ({ ...current, acceptTerms: "Please accept the pre-order terms to continue." }));
      push("Please accept the pre-order terms before submitting.", "error");
      return;
    }

    const payload = {
      idempotencyKey: makeIdempotencyKey(),
      customer: {
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        phone: draft.phone.trim(),
        address: draft.address.trim(),
        city: draft.city.trim(),
      },
      items: lines.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        brandName: brandChoices[line.key] ?? "",
      })),
      preferences: {
        kiteSize: draft.kiteSize,
        kiteType: draft.kiteType,
        dorType: draft.dorType,
        brandName: draft.brandName,
      },
      note: draft.note.trim(),
      acceptTerms: true,
    };

    setSubmitting(true);
    setErrors({});
    try {
      const data = await api<{ order: PreorderSubmissionResult }>("/api/preorders", { method: "POST", body: payload });
      sessionStorage.removeItem(DRAFT_KEY);
      const params = new URLSearchParams({ token: data.order.trackingToken });
      navigate(`/confirmation/${data.order.reference}?${params.toString()}`, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        push(error.message, "error");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        push("We could not submit your pre-order. Please check your connection and try again.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-x py-10">
      <p className="section-eyebrow">Step 2 of 3</p>
      <h1 className="mt-2 font-display text-3xl font-black">Pre-order details</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/65">
        Every field below goes straight to our team. No payment is taken now — we contact you to confirm availability, final
        price and delivery.
      </p>

      {!settings.preorders.enabled && (
        <p className="mt-5 rounded-xl border border-brand/30 bg-brand-soft p-4 text-sm font-semibold text-brand-dark">
          Pre-orders are currently paused by Metro Lahore Kites. You can review your cart, but submission is disabled.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Cart lines with per-line variant / brand / quantity */}
          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-black">1. Your items</h2>
            <p className="mt-1 text-xs text-ink/55">
              Size, type, brand and quantity are confirmed for each item individually — nothing here overrides the rest of
              your cart.
            </p>

            <ul className="mt-5 space-y-5">
              {lines.map((line) => {
                const product = catalog.find((item) => item.id === line.productId);
                return (
                  <li key={line.key} className="rounded-xl border border-ink/10 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-display font-bold">{line.productName}</p>
                        <p className="text-xs text-ink/55">
                          {line.categoryName} · {line.unitLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(line.key)}
                        className="text-xs font-semibold text-brand hover:underline"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="field-label" htmlFor={`variant-${line.key}`}>
                          Kite size / variant <span className="text-brand">*</span>
                        </label>
                        <Select
                          id={`variant-${line.key}`}
                          value={line.variantId}
                          onChange={(event) => {
                            const nextVariantId = event.target.value;
                            const nextVariant = product?.variants.find((item) => item.id === nextVariantId);
                            if (product && nextVariant && nextVariant.id !== line.variantId) {
                              // Moving a line to another variant: add under the new key
                              // (merging if it already exists), then drop the old line.
                              add(product, nextVariant, line.quantity);
                              remove(line.key);
                            }
                          }}
                        >
                          {product?.variants.map((item) => (
                            <option key={item.id} value={item.id} disabled={item.stockStatus !== "available"}>
                              {item.name}
                              {item.stockStatus !== "available" ? " — unavailable" : ""}
                            </option>
                          )) ?? <option value={line.variantId}>{line.variantName}</option>}
                        </Select>
                      </div>

                      <div>
                        <label className="field-label" htmlFor={`brand-${line.key}`}>
                          Brand <span className="text-brand">*</span>
                        </label>
                        <Select
                          id={`brand-${line.key}`}
                          value={brandChoices[line.key] ?? line.brandName}
                          onChange={(event) => setBrandChoices((current) => ({ ...current, [line.key]: event.target.value }))}
                        >
                          {brands.map((brand) => (
                            <option key={brand} value={brand}>
                              {brand}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <span className="field-label">Quantity <span className="text-brand">*</span></span>
                        <QuantityStepper
                          value={line.quantity}
                          onChange={(next) => setQuantity(line.key, next)}
                          size="sm"
                          label={`${line.productName} quantity`}
                        />
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-ink/55">
                      {line.pricePkr !== null ? `${formatPkr(line.pricePkr)} per ${line.unit}` : "Price to be confirmed by our team"}
                    </p>
                  </li>
                );
              })}
            </ul>

            <Link to="/shop" className="mt-4 inline-block text-sm font-semibold text-ink/70 hover:text-brand">
              ← Add more items
            </Link>
          </section>

          {/* Customer information */}
          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-black">2. Your information</h2>
            <p className="mt-1 text-xs text-ink/55">Required — we use these details only to confirm and deliver your order.</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="First Name" htmlFor="firstName" required error={errors["customer.firstName"]}>
                <Input
                  id="firstName"
                  name="firstName"
                  autoComplete="given-name"
                  value={draft.firstName}
                  invalid={Boolean(errors["customer.firstName"])}
                  onChange={(event) => set("firstName", event.target.value)}
                />
              </Field>
              <Field label="Last Name" htmlFor="lastName" required error={errors["customer.lastName"]}>
                <Input
                  id="lastName"
                  name="lastName"
                  autoComplete="family-name"
                  value={draft.lastName}
                  invalid={Boolean(errors["customer.lastName"])}
                  onChange={(event) => set("lastName", event.target.value)}
                />
              </Field>
              <Field
                label="Mobile / WhatsApp Number"
                htmlFor="phone"
                required
                hint="e.g. 0300 1234567"
                error={errors["customer.phone"]}
                className="sm:col-span-2"
              >
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="03XXXXXXXXX"
                  value={draft.phone}
                  invalid={Boolean(errors["customer.phone"])}
                  onChange={(event) => set("phone", event.target.value)}
                />
              </Field>
              <Field
                label="Full Delivery Address"
                htmlFor="address"
                required
                hint="House, street, area and any landmark that helps our rider."
                error={errors["customer.address"]}
                className="sm:col-span-2"
              >
                <Textarea
                  id="address"
                  name="address"
                  autoComplete="street-address"
                  value={draft.address}
                  invalid={Boolean(errors["customer.address"])}
                  onChange={(event) => set("address", event.target.value)}
                />
              </Field>
              <Field label="City / Location" htmlFor="city" required error={errors["customer.city"]}>
                <Input
                  id="city"
                  name="city"
                  autoComplete="address-level2"
                  value={draft.city}
                  invalid={Boolean(errors["customer.city"])}
                  onChange={(event) => set("city", event.target.value)}
                  list="city-options"
                />
                <datalist id="city-options">
                  {settings.options.cities.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </Field>
              <Field label="Order note" htmlFor="note" hint="Anything our team should know (optional)">
                <Input
                  id="note"
                  name="note"
                  value={draft.note}
                  maxLength={1000}
                  onChange={(event) => set("note", event.target.value)}
                />
              </Field>
            </div>
          </section>

          {/* Preferences — only shown when relevant to the cart */}
          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-lg font-black">3. Order preferences</h2>
            <p className="mt-1 text-xs text-ink/55">
              These help our team prepare exactly what you want. Your per-item choices above always take priority.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(hasKiteLines || hasDorLines) && (
                <Field
                  label="Kite Size"
                  htmlFor="kiteSize"
                  required={hasKiteLines}
                  error={errors["preferences.kiteSize"]}
                >
                  <Select
                    id="kiteSize"
                    value={draft.kiteSize}
                    invalid={Boolean(errors["preferences.kiteSize"])}
                    onChange={(event) => set("kiteSize", event.target.value)}
                  >
                    <option value="">Select kite size</option>
                    {kiteSizeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {hasKiteLines && (
                <Field label="Kite Type" htmlFor="kiteType" required error={errors["preferences.kiteType"]}>
                  <Select
                    id="kiteType"
                    value={draft.kiteType}
                    invalid={Boolean(errors["preferences.kiteType"])}
                    onChange={(event) => set("kiteType", event.target.value)}
                  >
                    <option value="">Select kite type</option>
                    <option value="Patang">Patang</option>
                    <option value="Gudda">Gudda</option>
                    <option value="Mixed Patang & Gudda">Mixed Patang &amp; Gudda</option>
                    <option value="Kite & Dor Kit">Kite &amp; Dor Kit</option>
                  </Select>
                </Field>
              )}

              {hasDorLines && (
                <Field label="Dor / Pinna Type" htmlFor="dorType" required={hasDorLines} error={errors["preferences.dorType"]}>
                  <Select
                    id="dorType"
                    value={draft.dorType}
                    invalid={Boolean(errors["preferences.dorType"])}
                    onChange={(event) => set("dorType", event.target.value)}
                  >
                    <option value="">Select dor / pinna type</option>
                    {settings.options.dorTypes.map((option) => (
                      <option key={option} value={option}>
                        {option} pinna
                      </option>
                    ))}
                    <option value="Cotton dor (size in item list)">Cotton dor (size in item list)</option>
                  </Select>
                </Field>
              )}

              <Field label="Brand" htmlFor="brandName" required error={errors["preferences.brandName"]}>
                <Select
                  id="brandName"
                  value={draft.brandName}
                  invalid={Boolean(errors["preferences.brandName"])}
                  onChange={(event) => set("brandName", event.target.value)}
                >
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </section>
        </div>

        {/* Review & submit */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card p-6">
            <h2 className="font-display text-lg font-black">Review &amp; submit</h2>

            <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1 text-sm">
              {lines.map((line) => (
                <li key={line.key} className="flex justify-between gap-3">
                  <span>
                    <span className="font-semibold">{line.productName}</span>
                    <span className="block text-xs text-ink/55">
                      {line.variantName} · {brandChoices[line.key] ?? line.brandName} · ×{line.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium">
                    {line.pricePkr !== null ? formatPkr(line.pricePkr * line.quantity) : "TBC"}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-ink/10 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink/60">Total items</dt>
                <dd className="font-semibold">{itemCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink/60">Estimated total</dt>
                <dd className="text-right font-semibold">
                  {allPriced ? formatPkr(totalPkr) : "Final price to be confirmed by Metro Lahore Kites"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink/60">Advance payment</dt>
                <dd className="font-semibold text-emerald-700">None</dd>
              </div>
            </dl>

            <label className="mt-4 flex items-start gap-3 text-xs leading-5 text-ink/70">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-0.5 size-4 accent-[#E30613]"
                required
              />
              <span>
                I understand this is a pre-order <strong>request</strong>, not a confirmed sale. Availability, final price and
                delivery are confirmed by Metro Lahore Kites. I accept the pre-order terms.
              </span>
            </label>
            {!acceptedTerms && errors["acceptTerms"] && (
              <p className="field-error" role="alert">{errors["acceptTerms"]}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !settings.preorders.enabled}
              className="btn-primary mt-5 w-full py-3"
            >
              {submitting ? "Submitting…" : "Submit Pre-Order"}
            </button>
            <p className="mt-3 text-center text-xs text-ink/50">
              No payment now. No card details are ever requested.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
