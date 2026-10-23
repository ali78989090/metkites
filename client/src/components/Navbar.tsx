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
    <div className="w-full">
      {/* Basant Festival Promotional Announcement Bar */}
      <aside
        aria-label="Festival Announcement"
        className="relative z-30 border-b border-white/10 bg-gradient-to-r from-zinc-950 via-[#180730] to-zinc-950 py-2 text-white shadow-inner"
      >
        <div className="container-x flex flex-col items-center justify-between gap-1.5 text-xs sm:flex-row sm:gap-4">
          <div className="flex flex-wrap items-center justify-center gap-2 text-center sm:justify-start sm:text-left">
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
            </span>
            <span className="whitespace-nowrap rounded-full bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide text-rose-300 ring-1 ring-rose-400/40">
              BASANT 2026
            </span>
            <span className="hidden font-display text-[13px] text-rose-100 md:inline">
              لاہور کی پہچان، بسنت کی اڑان — Authentic Kite &amp; Cotton Dor Pre-Orders Open
            </span>
            <span className="font-display text-[12px] text-rose-100 md:hidden">
              Basant Festival 2026 Pre-Orders Live!
            </span>
          </div>

          <Link
            to="/shop"
            className="group flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white/10 px-3 py-0.5 text-[11px] font-bold text-rose-300 ring-1 ring-white/10 transition-all hover:bg-rose-600 hover:text-white hover:ring-rose-500"
          >
            <span>Book Your Dor &amp; Kites</span>
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </aside>

      {/* Main Sticky Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-md shadow-[0_2px_15px_rgba(0,0,0,0.03)] transition-all">
        <div className="container-x flex h-16 items-center justify-between gap-2 sm:h-20 sm:gap-4 lg:gap-6">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex shrink-0 items-center transition-transform hover:scale-[1.01]"
            aria-label="Metro Lahore Kites — Home"
          >
            <Logo className="h-8 sm:h-10 md:h-12" />
          </Link>

          {/* Desktop Navigation Links — single line, no vertical stacking */}
          <nav
            className="hidden flex-1 items-center justify-center gap-1 xl:gap-1.5 lg:flex"
            aria-label="Main navigation"
          >
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
                    "whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs xl:px-3.5 xl:text-sm font-bold tracking-normal transition-all duration-200",
                    active
                      ? "bg-rose-600 text-white shadow-sm shadow-rose-600/30"
                      : "text-zinc-700 hover:bg-zinc-100 hover:text-rose-600",
                  )}
                >
                  {link.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            {/* Dedicated Admin Portal Capsule Button */}
            <Link
              to={user?.role === "admin" ? "/admin" : "/admin/login"}
              title="Admin Portal — Staff & Management Access"
              aria-label="Admin Portal"
              className="group relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-black/10 bg-zinc-950 px-2.5 py-1.5 sm:px-3 text-xs font-bold text-white transition-all hover:bg-zinc-800 hover:border-zinc-700 hover:shadow-md"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.5 text-rose-400 transition-transform group-hover:scale-110"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span className="hidden font-display text-[11px] font-black tracking-wider sm:inline uppercase">
                Admin
              </span>
            </Link>

            {/* Shopping Cart Button */}
            <Link
              to="/cart"
              className="relative shrink-0 rounded-full p-2 text-zinc-800 hover:bg-zinc-100 transition-colors"
              aria-label={`Pre-order cart, ${count} item${count === 1 ? "" : "s"}`}
            >
              <CartIcon />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold leading-5 text-white shadow-sm">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>

            {/* Customer Account / Auth Links */}
            {user ? (
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setMenuOpen((value) => !value)}
                  className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-100 transition-colors"
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                >
                  <span className="grid size-6 place-items-center rounded-full bg-zinc-950 text-xs font-bold text-white">
                    {user.fullName.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden md:block text-xs font-bold text-zinc-900">
                    {user.fullName.split(" ")[0]}
                  </span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur-md">
                    <Link
                      to="/account"
                      className="block rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                    >
                      My Orders
                    </Link>
                    <Link
                      to="/account?tab=profile"
                      className="block rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                    >
                      Profile
                    </Link>
                    {user.role === "admin" && (
                      <Link
                        to="/admin"
                        className="block rounded-xl px-3.5 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50"
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="block w-full rounded-xl px-3.5 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-1.5 sm:flex">
                <Link
                  to="/login"
                  className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs xl:px-3.5 xl:text-sm font-bold text-zinc-800 hover:text-rose-600 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="whitespace-nowrap rounded-full bg-rose-600 px-3.5 py-1.5 xl:px-4 xl:py-2 text-xs xl:text-sm font-bold text-white shadow-sm shadow-rose-600/30 hover:bg-rose-700 transition-all"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Drawer Trigger Toggle */}
            <button
              type="button"
              className="rounded-full p-2 text-zinc-800 hover:bg-zinc-100 lg:hidden transition-colors"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="size-5"
                aria-hidden="true"
              >
                {open ? (
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation Drawer */}
        {open && (
          <nav className="border-t border-ink/8 bg-white/98 backdrop-blur-md lg:hidden shadow-lg" aria-label="Mobile navigation">
            <div className="container-x flex flex-col gap-1 py-3">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-ink/80 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                  {link.label}
                </NavLink>
              ))}
              <div className="mt-2 flex gap-2 border-t border-ink/8 pt-3">
                {user ? (
                  <>
                    <Link to="/account" className="btn-outline flex-1 py-2 text-xs font-bold">
                      My Orders
                    </Link>
                    <button type="button" onClick={() => void logout()} className="btn-dark flex-1 py-2 text-xs font-bold">
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="btn-outline flex-1 py-2 text-xs font-bold">
                      Login
                    </Link>
                    <Link to="/register" className="btn-dark flex-1 py-2 text-xs font-bold">
                      Register
                    </Link>
                  </>
                )}
              </div>
              <div className="mt-2 border-t border-ink/8 pt-2">
                <Link
                  to={user?.role === "admin" ? "/admin" : "/admin/login"}
                  className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-50/90 py-2.5 text-xs font-bold text-rose-900 shadow-xs"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 text-rose-600">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  Admin Portal (Staff Only)
                </Link>
              </div>
            </div>
          </nav>
        )}
      </header>
    </div>
  );
}
