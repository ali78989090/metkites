import { Link } from "react-router-dom";
import { useSettings } from "../lib/settings";

export function ContactPage() {
  const { settings } = useSettings();
  const { business } = settings;
  const whatsappUrl = business.whatsapp ? `https://wa.me/${business.whatsapp}` : null;

  return (
    <div className="container-x max-w-4xl py-12">
      <p className="section-eyebrow">Contact</p>
      <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">Talk to Metro Lahore Kites</h1>
      <p className="mt-3 text-base leading-7 text-ink/70">
        Questions about sizes, quantities or delivery? Send us a message — we reply during the kite season from morning to
        night.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-lg font-black">WhatsApp</h2>
          {whatsappUrl ? (
            <>
              <p className="mt-2 text-sm text-ink/65">Fastest way to reach us.</p>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4 inline-flex bg-emerald-600 hover:bg-emerald-700">
                Chat on WhatsApp
              </a>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink/60">
              Our WhatsApp number is being configured. Please use the phone or email below, or ask on the pre-order form.
            </p>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg font-black">Other ways to reach us</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink/70">
            <li>
              <span className="font-semibold text-ink">Location:</span> {business.address}
            </li>
            {business.phone && (
              <li>
                <span className="font-semibold text-ink">Phone:</span> {business.phone}
              </li>
            )}
            {business.email && (
              <li>
                <span className="font-semibold text-ink">Email:</span> {business.email}
              </li>
            )}
            <li>
              <span className="font-semibold text-ink">Delivery:</span> {business.deliveryCoverage || "Confirmed per order"}
            </li>
          </ul>
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="font-display text-lg font-black">Already placed a pre-order?</h2>
        <p className="mt-2 text-sm text-ink/65">
          Quote your pre-order reference (for example MLK-261021-XXXXXX) so we can find your request quickly.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/track" className="btn-outline">Track my pre-order</Link>
          <Link to="/shop" className="btn-ghost">Back to shop</Link>
        </div>
      </div>
    </div>
  );
}
