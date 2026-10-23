import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Category, Product } from "../lib/types";
import { ProductCard } from "../components/ProductCard";
import { Skeleton } from "../components/ui";
import { cn } from "../lib/format";

import { motion } from "framer-motion";

function DorPinna({
  className,
  threadColor = "#e11d48",
  label = "Cotton Dor",
}: {
  className?: string;
  threadColor?: string;
  label?: string;
}) {
  return (
    <div className={cn("pointer-events-none select-none", className)}>
      <div className="relative group">
        <svg viewBox="0 0 130 130" className="w-28 sm:w-32 drop-shadow-[0_12px_24px_rgba(225,29,72,0.45)]">
          <defs>
            <linearGradient id={`spoolGrad-${threadColor.replace("#", "")}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#be123c" />
              <stop offset="45%" stopColor={threadColor} />
              <stop offset="85%" stopColor="#881337" />
              <stop offset="100%" stopColor="#4c0519" />
            </linearGradient>
            <linearGradient id="spindleWood" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="50%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>
            <linearGradient id="brassTip" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
          </defs>

          {/* Wooden Spindle Axis through the spool */}
          <line x1="22" y1="22" x2="108" y2="108" stroke="url(#spindleWood)" strokeWidth="9" strokeLinecap="round" />
          <circle cx="22" cy="22" r="6" fill="url(#brassTip)" stroke="#ffffff" strokeWidth="0.8" />
          <circle cx="108" cy="108" r="6" fill="url(#brassTip)" stroke="#ffffff" strokeWidth="0.8" />

          {/* Spool Yarn Body (Cotton Dor Pinna) */}
          <ellipse
            cx="65"
            cy="65"
            rx="40"
            ry="25"
            transform="rotate(45 65 65)"
            fill={`url(#spoolGrad-${threadColor.replace("#", "")})`}
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeOpacity="0.5"
          />

          {/* Tightly Wound Cotton Thread Ribs */}
          <path d="M 46 44 Q 65 60, 84 76" stroke="#ffe4e6" strokeWidth="1.6" fill="none" opacity="0.9" />
          <path d="M 40 52 Q 62 68, 80 84" stroke="#ffffff" strokeWidth="1.4" fill="none" opacity="0.85" />
          <path d="M 52 38 Q 70 54, 88 70" stroke="#fecdd3" strokeWidth="1.5" fill="none" opacity="0.8" />
          <path d="M 36 60 Q 56 76, 74 92" stroke="#ffe4e6" strokeWidth="1.3" fill="none" opacity="0.75" />
          <path d="M 58 32 Q 76 48, 94 64" stroke="#f43f5e" strokeWidth="1.4" fill="none" opacity="0.8" />

          {/* Loose Billowing Thread Unwinding into the Sky */}
          <path
            d="M 84 76 Q 104 94, 114 80 T 120 54 T 125 24"
            stroke="#fecdd3"
            strokeWidth="2"
            strokeDasharray="4 2"
            className="animate-thread"
            fill="none"
            opacity="0.95"
          />
        </svg>

        {/* Small Festive Label */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur border border-white/10">
          🧵 {label}
        </div>
      </div>
    </div>
  );
}

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
      {/* Hero Section with Centered Text, Animated Flying Kites & Dor Pinna Spools */}
      <section className="relative overflow-hidden border-b border-black/10 bg-[#0a0518] text-white">
        {/* Subtle Textured Backdrop with Night Sky & Purple Nebula Glows */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-overlay"
          style={{ backgroundImage: "url('/img/hero/hero-kites.webp')" }}
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#090314]/95 via-[#140728]/90 to-[#070212]/98"
          aria-hidden="true"
        />

        {/* Ambient Purple & Crimson Glow Spheres */}
        <div className="pointer-events-none absolute -left-20 top-1/4 size-96 rounded-full bg-purple-900/25 blur-[120px]" />
        <div className="pointer-events-none absolute -right-20 top-1/3 size-96 rounded-full bg-rose-900/25 blur-[120px]" />
        <div className="pointer-events-none absolute left-1/2 -top-20 -translate-x-1/2 size-96 rounded-full bg-purple-600/15 blur-[140px]" />

        {/* --- FLOATING ANIMATED ELEMENTS SURROUNDING THE CENTER TEXT --- */}

        {/* 1. Top-Left: Flying Golden & Red Patang Kite */}
        <div className="pointer-events-none absolute left-[4%] top-10 z-10 hidden sm:block animate-kite-1">
          <svg viewBox="0 0 100 130" className="w-24 md:w-28 drop-shadow-[0_12px_24px_rgba(225,29,72,0.45)]">
            <polygon points="50,10 90,50 50,85" fill="#facc15" />
            <polygon points="50,10 10,50 50,85" fill="#e11d48" />
            <path d="M 10 50 Q 50 20, 90 50" stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.95" />
            <line x1="50" y1="10" x2="50" y2="85" stroke="#0a0518" strokeWidth="2.5" />
            <polygon points="50,85 40,105 60,105" fill="#38bdf8" />
            <g className="animate-tail">
              <path d="M 50 105 Q 40 118, 55 125 T 48 135" stroke="#fbbf24" strokeWidth="3" fill="none" />
            </g>
            <path d="M 50 65 Q 20 100, -60 170" stroke="#fef08a" strokeWidth="1.2" strokeDasharray="4 2" opacity="0.5" fill="none" />
          </svg>
        </div>

        {/* 2. Mid-Left: Floating Authentic Cotton Dor Pinna Spool */}
        <div className="absolute left-[3%] bottom-16 z-10 hidden lg:block animate-pinna-1">
          <DorPinna threadColor="#e11d48" label="Lal Cotton Pinna" />
        </div>

        {/* 3. Top-Right: Flying Cyan & Crimson Gudda Kite */}
        <div className="pointer-events-none absolute right-[5%] top-12 z-10 hidden sm:block animate-kite-2">
          <svg viewBox="0 0 90 120" className="w-20 md:w-24 drop-shadow-[0_10px_20px_rgba(6,182,212,0.4)]">
            <polygon points="45,8 80,45 45,78" fill="#06b6d4" />
            <polygon points="45,8 10,45 45,78" fill="#e11d48" />
            <path d="M 10 45 Q 45 18, 80 45" stroke="#ffffff" strokeWidth="2" fill="none" />
            <line x1="45" y1="8" x2="45" y2="78" stroke="#0a0518" strokeWidth="2" />
            <polygon points="45,78 36,94 54,94" fill="#fbbf24" />
            <g className="animate-tail">
              <path d="M 45 94 Q 55 106, 42 118" stroke="#e11d48" strokeWidth="2.5" fill="none" />
            </g>
          </svg>
        </div>

        {/* 4. Mid-Right: Second Cotton Dor Pinna Spool (Golden-Yellow Thread) */}
        <div className="absolute right-[4%] bottom-20 z-10 hidden lg:block animate-pinna-2">
          <DorPinna threadColor="#f59e0b" label="Golden Cotton Pinna" />
        </div>

        {/* 5. Floating "Bo Kata!" Celebration Badge (near upper-right of centered text) */}
        <div className="pointer-events-none absolute right-[18%] top-20 z-20 hidden md:flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-white shadow-xl animate-bounce">
          <span>بو کاٹا!</span>
          <span className="text-[10px]">BO KATA!</span>
        </div>

        {/* Twinkling Night Sky Stars */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <span className="absolute left-[12%] top-16 size-1 rounded-full bg-white opacity-80 animate-pulse" />
          <span className="absolute left-[38%] top-12 size-1.5 rounded-full bg-rose-300 opacity-60 animate-ping" />
          <span className="absolute right-[22%] top-24 size-1 rounded-full bg-amber-300 opacity-70 animate-pulse" />
          <span className="absolute right-[42%] bottom-16 size-1.5 rounded-full bg-white opacity-60" />
        </div>

        {/* --- MAIN CENTERED CONTENT CONTAINER (FRAMER MOTION) --- */}
        <div className="container-x relative py-20 sm:py-28 lg:py-36">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mx-auto max-w-3xl text-center"
          >
            {/* Cultural Slogan Pill Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-xs font-bold text-rose-300 backdrop-blur shadow-sm"
            >
              <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
              <span>لاہور کی پہچان، بسنت کی اڑان</span>
              <span className="text-rose-400/50">·</span>
              <span className="text-white font-mono">BASANT 2026</span>
            </motion.div>

            {/* Main Centered Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mt-6 font-display text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl text-white"
            >
              Lahore&apos;s Historic Basant,{" "}
              <span className="bg-gradient-to-r from-rose-500 via-red-400 to-amber-300 bg-clip-text text-transparent">
                Reserved For You.
              </span>
            </motion.h1>

            {/* Centered Descriptive Paragraph */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg"
            >
              Experience Lahore&apos;s celebrated kite-flying festival. Choose your preferred Patangs, Guddas,
              Tukkals and certified 100% cotton dor spools. Submit your pre-order today with{" "}
              <span className="font-bold text-rose-400">zero advance payment</span> — we confirm every detail
              with you personally on WhatsApp.
            </motion.p>

            {/* Centered CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-4"
            >
              <Link
                to="/shop"
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-rose-600 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-rose-600/30 transition-all hover:bg-rose-700 hover:scale-105 active:scale-[0.98]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-5">
                  <polygon points="12,2 22,8.5 12,15 2,8.5" />
                  <polyline points="2,15.5 12,22 22,15.5" />
                </svg>
                Explore Festival Collection
              </Link>
              <Link
                to="/how-pre-orders-work"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 py-3.5 text-base font-bold text-white backdrop-blur transition-all hover:bg-white/20 hover:border-white/40 active:scale-[0.98]"
              >
                How Pre-Orders Work
              </Link>
            </motion.div>

            {/* Centered Key Value Propositions */}
            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75, duration: 0.6 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold text-zinc-300"
            >
              <li className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-rose-500/20 text-xs font-bold text-rose-400">✓</span>
                Zero advance payment
              </li>
              <li className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-rose-500/20 text-xs font-bold text-rose-400">✓</span>
                Guest checkout — no login needed
              </li>
              <li className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-rose-500/20 text-xs font-bold text-rose-400">✓</span>
                Certified 100% Cotton Dor only
              </li>
            </motion.ul>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-x py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-eyebrow">Browse</p>
            <h2 className="mt-2 font-display text-2xl font-black sm:text-3xl">Shop by category</h2>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 shadow-xs transition-all hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:shadow-md active:scale-95 sm:text-sm"
          >
            <span>View all products</span>
            <span>→</span>
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
      <section id="featured-products" className="scroll-mt-24 bg-mist/60 py-12 sm:py-16">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="section-eyebrow">Collection</p>
              <h2 className="mt-2 font-display text-2xl font-black sm:text-3xl">Pre-order favourites</h2>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-white px-4 py-2 text-xs font-bold text-rose-600 shadow-xs transition-all hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:shadow-md active:scale-95 sm:text-sm"
            >
              <span>Shop everything</span>
              <span>→</span>
            </Link>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

      {/* Official Government License & Registration Certificate Section */}
      <section className="border-t border-ink/8 bg-gradient-to-b from-white via-mist/50 to-white py-14 sm:py-20">
        <div className="container-x">
          <div className="mx-auto max-w-4xl rounded-3xl border border-emerald-600/20 bg-white p-6 shadow-xl ring-1 ring-black/5 sm:p-10">
            <div className="grid items-center gap-8 lg:grid-cols-12">
              {/* Left Column: Details & Verification Badge */}
              <div className="space-y-4 lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Govt. of Punjab Registered Manufacturer</span>
                </div>

                <h2 className="font-display text-2xl font-black text-ink sm:text-3xl">
                  Official Certificate of Registration for Basant
                </h2>

                <p className="text-sm leading-relaxed text-ink/70">
                  Metro Lahore Kites is an officially registered and authorized manufacturer under the{" "}
                  <strong className="text-ink">Punjab Regulation of Kite Flying Ordinance</strong> by the{" "}
                  <strong className="text-ink">Deputy Commissioner, Lahore</strong>. We strictly produce and supply
                  100% certified cotton dor spools and authentic permissible kites.
                </p>

                {/* Key Certification Points */}
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="rounded-xl border border-ink/10 bg-mist/60 p-3">
                    <p className="font-bold text-ink/50 uppercase text-[10px]">Registration No.</p>
                    <p className="mt-0.5 font-mono text-xs font-black text-ink">198782-09092026</p>
                  </div>
                  <div className="rounded-xl border border-ink/10 bg-mist/60 p-3">
                    <p className="font-bold text-ink/50 uppercase text-[10px]">License Category</p>
                    <p className="mt-0.5 font-sans text-xs font-black text-emerald-700">Kite Flying - Manufacturer</p>
                  </div>
                  <div className="rounded-xl border border-ink/10 bg-mist/60 p-3">
                    <p className="font-bold text-ink/50 uppercase text-[10px]">Managed By</p>
                    <p className="mt-0.5 font-sans text-xs font-bold text-ink">Ebad Furqan (Admin)</p>
                  </div>
                  <div className="rounded-xl border border-ink/10 bg-mist/60 p-3">
                    <p className="font-bold text-ink/50 uppercase text-[10px]">Authority</p>
                    <p className="mt-0.5 font-sans text-xs font-bold text-ink">Deputy Commissioner, Lahore</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-3">
                  <a
                    href="/img/certificate.png"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary py-2.5 text-xs font-bold"
                  >
                    View Full Certificate 📄
                  </a>
                  <a
                    href="https://wa.me/923262577882?text=Salam!%20I%20would%20like%20to%20verify%20the%20Govt%20Registration%20Certificate%20(Reg:%20198782-09092026)."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline flex items-center gap-2 border-emerald-500/30 text-emerald-700 hover:bg-emerald-50 text-xs font-bold py-2.5"
                  >
                    WhatsApp Verification 💬
                  </a>
                </div>
              </div>

              {/* Right Column: Framed Certificate Thumbnail with Click to Enlarge */}
              <div className="flex justify-center lg:col-span-5">
                <a
                  href="/img/certificate.png"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Click to view full high-resolution certificate"
                  className="group relative block overflow-hidden rounded-2xl border-4 border-emerald-600/20 bg-white p-1.5 shadow-2xl transition-transform duration-300 hover:scale-[1.03]"
                >
                  <img
                    src="/img/certificate.png"
                    alt="Official Certificate of Registration for Basant — Metro Lahore Kites"
                    className="max-h-[380px] w-auto rounded-xl object-contain"
                  />
                  <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 p-4">
                    <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-ink shadow-md backdrop-blur">
                      🔍 Click to enlarge certificate
                    </span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
