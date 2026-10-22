import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useCart } from "../lib/cart";
import { useAuth } from "../lib/auth";
import { Logo } from "./Logo";
import { cn } from "../lib/format";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/shop", label: "Shop Kites" },
  { to: "/shop?category=kite-dor-kits", label: "Kite & Dor Kits" },
  { to: "/how-pre-orders-work", label: "How Pre-Orders Work" },
  { to: "/contact", label: "Contact" },
  { to: "/track", label: "Track Order" },
];

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5" aria-hidden="true">
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="20" r="1.4" />
      <circle cx="17.5" cy="20" r="1.4" />
    </svg>
  );
}

export function Navbar() {
  const { count } = useCart();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  return (
    <header className="sticky top-0 z-50 border-b border-ink/8 bg-white/95 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-2 sm:h-20 sm:gap-6">
        <Link to="/" className="flex shrink-0 items-center" aria-label="Metro Lahore Kites — home">
          <Logo className="h-8 sm:h-10 md:h-12" />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Main navigation">
          {links.map((link) => {
            const active = link.end
              ? location.pathname === link.to
              : link.to.includes("?")
                ? location.pathname === "/shop" && location.search.includes(link.to.split("?")[1])
                : location.pathname === link.to;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  active ? "text-brand" : "text-ink/70 hover:bg-mist hover:text-ink",
                )}
              >
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="ml-0 flex items-center gap-0.5 sm:ml-auto sm:gap-1.5">
          <Link
            to="/cart"
            className="relative rounded-lg p-2 text-ink hover:bg-mist"
            aria-label={`Pre-order cart, ${count} item${count === 1 ? "" : "s"}`}
          >
            <CartIcon />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold leading-5 text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>

          {user ? (
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold hover:bg-mist"
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                <span className="grid size-7 place-items-center rounded-full bg-ink text-xs font-bold text-white">
                  {user.fullName.trim().charAt(0).toUpperCase()}
                </span>
                <span className="hidden md:block">{user.fullName.split(" ")[0]}</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-ink/10 bg-white py-1.5 shadow-xl">
                  <Link to="/account" className="block px-4 py-2 text-sm font-medium hover:bg-mist">
                    My Orders
                  </Link>
                  <Link to="/account?tab=profile" className="block px-4 py-2 text-sm font-medium hover:bg-mist">
                    Profile
                  </Link>
                  {user.role === "admin" && (
                    <Link to="/admin" className="block px-4 py-2 text-sm font-medium text-brand hover:bg-mist">
                      Admin Dashboard
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="block w-full px-4 py-2 text-left text-sm font-medium hover:bg-mist"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="btn-ghost">
                Login
              </Link>
              <Link to="/register" className="btn-dark">
                Register
              </Link>
            </div>
          )}

          <button
            type="button"
            className="rounded-lg p-2.5 hover:bg-mist lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-ink/8 bg-white lg:hidden" aria-label="Mobile navigation">
          <div className="container-x flex flex-col gap-1 py-3">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-ink/80 hover:bg-mist"
              >
                {link.label}
              </NavLink>
            ))}
            <div className="mt-2 flex gap-2 border-t border-ink/8 pt-3">
              {user ? (
                <>
                  <Link to="/account" className="btn-outline flex-1">
                    My Orders
                  </Link>
                  <button type="button" onClick={() => void logout()} className="btn-dark flex-1">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-outline flex-1">
                    Login
                  </Link>
                  <Link to="/register" className="btn-dark flex-1">
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
