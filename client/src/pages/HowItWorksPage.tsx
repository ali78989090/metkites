import { Link } from "react-router-dom";
import { useSettings } from "../lib/settings";

export function HowItWorksPage() {
  const { settings } = useSettings();
  const steps = (settings.preorders.instructions || "").split("\n").filter(Boolean);

  return (
    <div className="container-x max-w-4xl py-12">
      <p className="section-eyebrow">Guides</p>
      <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">How pre-orders work</h1>
      <p className="mt-3 text-base leading-7 text-ink/70">
        Metro Lahore Kites runs a simple pre-order system: you reserve what you want ahead of the season, we confirm
        everything with you personally, and nothing is paid in advance through this website.
      </p>

      <ol className="mt-8 space-y-4">
        {(steps.length > 0
          ? steps
          : [
              "1. Choose your kites, sizes and dor and add them to your pre-order cart.",
              "2. Submit the pre-order form with your delivery details.",
              "3. Receive your unique pre-order reference number.",
              "4. Our team confirms availability, final price and delivery with you.",
              "5. Pay only when your order is confirmed.",
            ]
        ).map((step, index) => (
          <li key={index} className="card flex gap-4 p-5">
            <span className="font-display text-2xl font-black text-brand/25">0{index + 1}</span>
            <p className="pt-1 text-sm leading-6 text-ink/75">{step}</p>
          </li>
        ))}
      </ol>

      <section className="mt-10">
        <h2 className="font-display text-xl font-black">Good to know</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <h3 className="font-display font-bold">No advance payment</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              We never ask for card details on this website. Payment is arranged directly with our team once your order is
              confirmed.
            </p>
          </div>
          <div className="card p-5">
            <h3 className="font-display font-bold">No account needed</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              Guest pre-orders are welcome. An account simply lets you see your own orders later.
            </p>
          </div>
          <div className="card p-5">
            <h3 className="font-display font-bold">Cotton dor only</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              We sell plain cotton dor/pinna only. Glass-coated (sharp) manja, chemical or metal coated and nylon cutting
              strings are not offered.
            </p>
          </div>
          <div className="card p-5">
            <h3 className="font-display font-bold">Prices confirmed by us</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              Where a price is shown as “to be confirmed”, our team shares the final price with you before you commit.
            </p>
          </div>
        </div>
      </section>

      {settings.legal.notice && (
        <p className="mt-10 rounded-2xl border border-ink/10 bg-mist/70 p-5 text-sm leading-6 text-ink/70">
          {settings.legal.notice}
        </p>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/shop" className="btn-primary">Explore Collection</Link>
        <Link to="/track" className="btn-outline">Track an order</Link>
      </div>
    </div>
  );
}
