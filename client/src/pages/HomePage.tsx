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
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink/8">
        <img
          src="/img/hero/hero-kites.webp"
          alt="Colourful kites flying over the Lahore skyline"
          className="absolute inset-0 size-full object-cover object-center"
          fetchPriority="high"
          width={1800}
          height={1100}
        />
        <div className="hero-scrim absolute inset-0" aria-hidden="true" />
        <div className="container-x relative py-16 sm:py-24 lg:py-32">
          <div className="max-w-xl">
            <p className="section-eyebrow">Lahore · Pre-order season</p>
            <h1 className="mt-3 font-display text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Your Next Basant,
              <span className="text-brand"> Reserved.</span>
            </h1>
            <p className="mt-5 text-base leading-7 text-ink/75 sm:text-lg">
              Choose your preferred kites, sizes and dor. Submit your pre-order today with no advance payment —
              we confirm availability, price and delivery with you personally.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-primary px-6 py-3 text-base">
                Explore Collection
              </Link>
              <Link to="/how-pre-orders-work" className="btn-outline bg-white/80 px-6 py-3 text-base backdrop-blur">
                How Pre-Orders Work
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-ink/70">
              <li className="flex items-center gap-2"><span className="text-brand">✓</span> No advance payment</li>
              <li className="flex items-center gap-2"><span className="text-brand">✓</span> Guest checkout — no login</li>
              <li className="flex items-center gap-2"><span className="text-brand">✓</span> Cotton dor only</li>
            </ul>
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
