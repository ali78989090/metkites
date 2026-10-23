import { Link } from "react-router-dom";
import { useSettings } from "../lib/settings";
import { Logo } from "./Logo";

export function Footer() {
  const { settings } = useSettings();
  const business = settings.business;

  return (
    <footer className="mt-16 border-t border-ink/10 bg-ink text-white">
      <div className="container-x grid gap-8 py-10 sm:grid-cols-2 md:grid-cols-4 lg:gap-10 lg:py-12">
        <div className="sm:col-span-2 md:col-span-1">
          <div className="inline-block rounded-lg bg-white p-2 sm:p-2.5">
            <Logo className="h-12 sm:h-14" />
          </div>
          <p className="mt-4 text-sm leading-6 text-white/70">
            Premium Lahore kites, cotton dor and accessories — pre-ordered for Basant with no advance payment.
          </p>
        </div>

        <div>
          <h3 className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Shop</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-white/80">
              <li><Link className="hover:text-brand" to="/shop?category=patang">Patang</Link></li>
              <li><Link className="hover:text-brand" to="/shop?category=gudda">Gudda</Link></li>
              <li><Link className="hover:text-brand" to="/shop?category=kite-dor-kits">Kite &amp; Dor Kits</Link></li>
              <li><Link className="hover:text-brand" to="/shop?category=dor-pinna">Dor / Pinna</Link></li>
              <li><Link className="hover:text-brand" to="/shop?category=accessories">Accessories</Link></li>
            </ul>
        </div>

        <div>
          <h3 className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Help</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-white/80">
              <li><Link className="hover:text-rose-400" to="/how-pre-orders-work">How pre-orders work</Link></li>
              <li><Link className="hover:text-rose-400" to="/track">Track your pre-order</Link></li>
              <li><Link className="hover:text-rose-400" to="/account">My orders</Link></li>
              <li><Link className="hover:text-rose-400" to="/login">Client Login</Link></li>
              <li><Link className="hover:text-rose-400 font-medium text-rose-400/90" to="/admin/login">🔒 Staff Admin Portal</Link></li>
            </ul>
        </div>

        <div>
          <h3 className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Contact</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-white/80">
              <li className="leading-5">{business.address}</li>
              {business.phone && <li>Phone: {business.phone}</li>}
              {business.email && <li>Email: {business.email}</li>}
              {business.whatsapp ? (
                <li>
                  <a
                    className="font-medium text-brand hover:underline"
                    href={`https://wa.me/${business.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp us
                  </a>
                </li>
              ) : (
                <li className="text-white/50">WhatsApp contact: coming soon</li>
              )}
            </ul>
        </div>
      </div>

      {settings.legal.notice && (
        <div className="border-t border-white/10">
          <div className="mt-4 text-xs leading-5 text-white/55 sm:text-xs">{settings.legal.notice}</div>
        </div>
      )}

      <div className="border-t border-white/10 py-5">
        <div className="container-x flex flex-col gap-1 py-4 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:py-5">
        <p className="text-center sm:text-left">© {new Date().getFullYear()} Metro Lahore Kites. All rights reserved.</p>
        <p className="text-center sm:text-right">Pre-orders are requests — availability, price and delivery are confirmed by our team.</p>
        </div>
      </div>
    </footer>
  );
}
