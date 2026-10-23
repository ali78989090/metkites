import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Category, Product } from "../lib/types";
import { ProductCard } from "../components/ProductCard";
import { Skeleton } from "../components/ui";

const steps = [
  { n: "01", title: "Choose your kites", text: "Pick patang, gudda, dor and accessories in the sizes you want — add everything to your cart." },
  { n: "02", title: "Submit your pre-order", text: "Fill in your name, WhatsApp number and delivery address. No login and no advance payment needed." },
  { n: "03", title: "We confirm with you", text: "Our team reviews availability and contacts you to confirm the final price and delivery." },
  { n: "04", title: "Fly your Basant", text: "Your order is prepared and dispatched. Pay only when your order is confirmed." },
];

export function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    api<{ items: Category[] }>("/api/categories").then((data) => setCategories(data.items)).catch(() => undefined);
    api<{ items: Product[] }>("/api/products?limit=8&sort=featured")
      .then((data) => setProducts(data.items))
      .catch(() => setProducts([]));
  }, []);

  return (
    <>
      {/* Basant Festival Announcement Bar */}
      <div className="relative z-10 overflow-hidden bg-gradient-to-r from-[#16082f] via-[#281158] to-[#16082f] py-2.5 text-white shadow-inner">
        <div className="container-x flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-amber-400 animate-ping" />
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-300 ring-1 ring-amber-400/40 font-mono text-[11px]">
              FESTIVAL 2026
            </span>
            <span className="hidden sm:inline font-display text-amber-200">
              لاہور کی پہچان، بسنت کی اڑان — Official Heritage Kite Pre-Orders Now Live!
            </span>
            <span className="sm:hidden text-amber-200">Basant Lahore 2026 Pre-Orders Live!</span>
          </div>
          <Link
            to="/shop"
            className="group flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-white transition-colors"
          >
            <span>Book Your Dor &amp; Kites</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </div>

      {/* Hero Section with Animated Kites */}
      <section className="relative overflow-hidden border-b border-ink/8 bg-[#120729] text-white">
        {/* Sky background layer with subtle texture */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
          style={{ backgroundImage: "url('/img/hero/hero-kites.webp')" }}
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#190838]/95 via-[#16062f]/90 to-[#0d031c]/95"
          aria-hidden="true"
        />

        {/* Dynamic Flying Animated Kites (GIF-style smooth CSS motion) */}
        {/* Animated Kite 1: Golden Patang soaring high */}
        <div className="pointer-events-none absolute right-[10%] top-12 z-10 hidden sm:block animate-kite-1">
          <div className="relative">
            <svg viewBox="0 0 100 130" className="w-28 drop-shadow-[0_10px_25px_rgba(251,191,36,0.5)]">
              {/* Kite Wings */}
              <polygon points="50,10 90,50 50,85" fill="#facc15" />
              <polygon points="50,10 10,50 50,85" fill="#e11d48" />
              {/* Arch & Spine */}
              <path d="M 10 50 Q 50 20, 90 50" stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.95" />
              <line x1="50" y1="10" x2="50" y2="85" stroke="#120729" strokeWidth="2.5" />
              {/* Tail fin */}
              <polygon points="50,85 40,105 60,105" fill="#06b6d4" />
              {/* Animated Fluttering Ribbon Tail */}
              <g className="animate-tail">
                <path d="M 50 105 Q 40 118, 55 125 T 48 135" stroke="#fbbf24" strokeWidth="3" fill="none" />
              </g>
              {/* Dor String */}
              <path d="M 50 65 Q 10 110, -80 180" stroke="#fef08a" strokeWidth="1.2" strokeDasharray="4 2" opacity="0.6" fill="none" />
            </svg>
          </div>
        </div>

        {/* Animated Kite 2: Cyan & Crimson Gudda */}
        <div className="pointer-events-none absolute right-[32%] top-24 z-10 hidden md:block animate-kite-2">
          <div className="relative">
            <svg viewBox="0 0 90 120" className="w-20 drop-shadow-[0_8px_20px_rgba(6,182,212,0.4)]">
              <polygon points="45,8 80,45 45,78" fill="#06b6d4" />
              <polygon points="45,8 10,45 45,78" fill="#ec4899" />
              <path d="M 10 45 Q 45 18, 80 45" stroke="#ffffff" strokeWidth="2" fill="none" />
              <line x1="45" y1="8" x2="45" y2="78" stroke="#120729" strokeWidth="2" />
              <polygon points="45,78 36,94 54,94" fill="#fbbf24" />
              <g className="animate-tail">
                <path d="M 45 94 Q 55 106, 42 118" stroke="#ec4899" strokeWidth="2.5" fill="none" />
              </g>
            </svg>
          </div>
        </div>

        {/* Animated Kite 3: Emerald & Gold Tukkal floating near center */}
        <div className="pointer-events-none absolute right-[4%] bottom-16 z-10 hidden lg:block animate-kite-3">
          <div className="relative">
            <svg viewBox="0 0 85 110" className="w-24 drop-shadow-[0_8px_20px_rgba(16,185,129,0.35)]">
              <polygon points="42,8 76,42 42,72" fill="#10b981" />
              <polygon points="42,8 8,42 42,72" fill="#f59e0b" />
              <path d="M 8 42 Q 42 16, 76 42" stroke="#ffffff" strokeWidth="2" fill="none" />
              <line x1="42" y1="8" x2="42" y2="72" stroke="#120729" strokeWidth="2" />
              <polygon points="42,72 32,88 52,88" fill="#e11d48" />
              <g className="animate-tail">
                <path d="M 42 88 Q 30 100, 48 110" stroke="#f59e0b" strokeWidth="2.5" fill="none" />
              </g>
            </svg>
          </div>
        </div>

        {/* Twinkling festival stars / lights */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <span className="absolute left-[15%] top-10 size-1 rounded-full bg-amber-300 opacity-70 animate-pulse" />
          <span className="absolute left-[45%] top-20 size-1.5 rounded-full bg-yellow-200 opacity-60 animate-ping" />
          <span className="absolute right-[25%] top-14 size-1 rounded-full bg-white opacity-80 animate-pulse" />
          <span className="absolute right-[40%] bottom-20 size-1.5 rounded-full bg-amber-400 opacity-60" />
        </div>

        {/* Hero Content Grid */}
        <div className="container-x relative py-16 sm:py-24 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            {/* Left Column: Heading and CTAs */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold text-amber-300 backdrop-blur">
                <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                <span>لاہور کی پہچان، بسنت کی اڑان</span>
                <span className="text-amber-400/50">·</span>
                <span>Basant 2026 Celebration</span>
              </div>

              <h1 className="mt-5 font-display text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl text-white">
                Lahore&apos;s Historic Basant,{" "}
                <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                  Reserved for You.
                </span>
              </h1>

              <p className="mt-5 text-base leading-7 text-amber-100/80 sm:text-lg max-w-xl">
                Experience authentic Lahore kite flying. Choose your preferred Patangs, Guddas, Tukkals and certified
                100% cotton dor. Submit your pre-order today with <span className="font-bold text-amber-300">zero advance payment</span> —
                our team confirms availability and rates with you personally on WhatsApp.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/shop"
                  className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 px-7 py-3.5 text-base font-black text-slate-950 shadow-[0_0_25px_rgba(251,191,36,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_35px_rgba(251,191,36,0.6)]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-5">
                    <polygon points="12,2 22,8.5 12,15 2,8.5" />
                    <polyline points="2,15.5 12,22 22,15.5" />
                  </svg>
                  Explore Festival Collection
                </Link>
                <Link
                  to="/how-pre-orders-work"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-base font-bold text-white backdrop-blur transition-colors hover:bg-white/20"
                >
                  How Pre-Orders Work
                </Link>
              </div>

              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2.5 text-sm font-semibold text-amber-200/90">
                <li className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-amber-400/20 text-xs font-bold text-amber-300">✓</span>
                  Zero advance payment
                </li>
                <li className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-amber-400/20 text-xs font-bold text-amber-300">✓</span>
                  Guest checkout — no login needed
                </li>
                <li className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-amber-400/20 text-xs font-bold text-amber-300">✓</span>
                  Certified 100% Cotton Dor only
                </li>
              </ul>
            </div>

            {/* Right Column: Festive Showcase Card with Bo-Kata badge and Animated Kite duel */}
            <div className="relative lg:col-span-5">
              <div className="relative mx-auto max-w-sm rounded-3xl border border-amber-400/25 bg-gradient-to-b from-white/10 to-white/5 p-6 backdrop-blur-md shadow-2xl">
                {/* Floating "Bo Kata!" badge */}
                <div className="absolute -top-3.5 right-6 z-20 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-600 to-amber-600 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-white shadow-lg animate-bounce">
                  <span>بو کاٹا!</span>
                  <span className="text-[10px]">BO KATA!</span>
                </div>

                {/* Sky duel scene */}
                <div className="relative h-48 overflow-hidden rounded-2xl bg-gradient-to-b from-[#1c0838] via-[#2a0e4e] to-[#120524] p-4 border border-white/10">
                  <div className="absolute top-4 left-6 animate-kite-1">
                    <svg viewBox="0 0 50 65" className="w-14">
                      <polygon points="25,5 45,25 25,45" fill="#facc15" />
                      <polygon points="25,5 5,25 25,45" fill="#e11d48" />
                      <path d="M 5 25 Q 25 10, 45 25" stroke="#fff" strokeWidth="1.5" fill="none" />
                      <line x1="25" y1="5" x2="25" y2="45" stroke="#000" strokeWidth="1.5" />
                      <polygon points="25,45 20,55 30,55" fill="#06b6d4" />
                    </svg>
                  </div>

                  <div className="absolute top-10 right-6 animate-kite-2">
                    <svg viewBox="0 0 50 65" className="w-12">
                      <polygon points="25,5 45,25 25,45" fill="#06b6d4" />
                      <polygon points="25,5 5,25 25,45" fill="#10b981" />
                      <path d="M 5 25 Q 25 10, 45 25" stroke="#fff" strokeWidth="1.5" fill="none" />
                      <line x1="25" y1="5" x2="25" y2="45" stroke="#000" strokeWidth="1.5" />
                      <polygon points="25,45 20,55 30,55" fill="#facc15" />
                    </svg>
                  </div>

                  {/* Crossing Dor Thread */}
                  <svg className="absolute inset-0 size-full pointer-events-none" viewBox="0 0 200 150">
                    <path d="M 35 45 Q 100 80, 165 40" stroke="#facc15" strokeWidth="1.2" strokeDasharray="3 3" fill="none" />
                  </svg>

                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between rounded-lg bg-black/40 px-3 py-1.5 backdrop-blur text-[11px] text-amber-200 font-mono">
                    <span>Authentic Lahore Craft</span>
                    <span className="font-bold text-amber-400">Basant 2026</span>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-semibold text-amber-200">Featured Kits</span>
                    <span className="text-xs font-bold text-amber-400">Patang + Cotton Dor Spools</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-semibold text-amber-200">Order Method</span>
                    <span className="text-xs font-bold text-emerald-400">Zero Advance Pre-Order</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-200">Confirmation</span>
                    <span className="text-xs font-bold text-white">Direct WhatsApp Assistance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-x py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-eyebrow">Browse</p>
            <h2 className="mt-2 font-display text-2xl font-black sm:text-3xl">Shop by category</h2>
          </div>
          <Link to="/shop" className="text-sm font-semibold text-brand hover:underline">
            View all products →
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {categories.length === 0
            ? Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="aspect-[4/3] w-full rounded-2xl" />)
            : categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/shop?category=${category.slug}`}
                  className="card group overflow-hidden transition-transform hover:-translate-y-1"
                >
                  <img
                    src={category.image ?? "/img/placeholders/product-placeholder.webp"}
                    alt={category.name}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-display font-bold group-hover:text-brand">{category.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-ink/55">{category.description}</p>
                  </div>
                </Link>
              ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="bg-mist/60 py-12 sm:py-16">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="section-eyebrow">Collection</p>
              <h2 className="mt-2 font-display text-2xl font-black sm:text-3xl">Pre-order favourites</h2>
            </div>
            <Link to="/shop" className="text-sm font-semibold text-brand hover:underline">
              Shop everything →
            </Link>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products === null
              ? Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="card overflow-hidden">
                    <Skeleton className="aspect-[4/3] w-full rounded-none" />
                    <div className="space-y-3 p-5">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  </div>
                ))
              : products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>

          {products && products.length === 0 && (
            <p className="mt-6 text-sm text-ink/60">The catalogue is being prepared — please check back shortly.</p>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="container-x py-12 sm:py-16">
        <p className="section-eyebrow">Simple &amp; safe</p>
        <h2 className="mt-2 font-display text-2xl font-black sm:text-3xl">How pre-orders work</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.n} className="card p-6">
              <span className="font-display text-3xl font-black text-brand/25">{step.n}</span>
              <h3 className="mt-3 font-display text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink/65">{step.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link to="/how-pre-orders-work" className="btn-dark">
            Read the full guide
          </Link>
        </div>
      </section>
    </>
  );
}
