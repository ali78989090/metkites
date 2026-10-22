import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { Product } from "../lib/types";
import { useCart } from "../lib/cart";
import { useToast } from "../components/Toast";
import { ProductImage } from "../components/Logo";
import { QuantityStepper } from "../components/QuantityStepper";
import { ProductCard } from "../components/ProductCard";
import { Skeleton } from "../components/ui";
import { formatPkr } from "../lib/format";
import { useSettings } from "../lib/settings";

export function ProductPage() {
  const { slug = "" } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const { add } = useCart();
  const { push } = useToast();
  const { settings } = useSettings();

  useEffect(() => {
    let cancelled = false;
    setProduct(null);
    setNotFound(false);
    setActiveImage(0);
    api<{ product: Product; related: Product[] }>(`/api/products/${slug}`)
      .then((data) => {
        if (cancelled) return;
        setProduct(data.product);
        setRelated(data.related);
        setSelectedVariantId(data.product.variants.find((v) => v.stockStatus === "available")?.id ?? data.product.variants[0]?.id ?? "");
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (notFound) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="font-display text-3xl font-black">Product not found</h1>
        <p className="mt-3 text-ink/60">This product may have been removed or renamed.</p>
        <Link to="/shop" className="btn-primary mt-6">Back to shop</Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-x grid gap-10 py-12 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-11 w-64" />
        </div>
      </div>
    );
  }

  const variant = product.variants.find((item) => item.id === selectedVariantId);
  const effectivePrice = variant?.pricePkr ?? product.pricePkr;
  const gallery = product.images.length > 0 ? product.images : [{ id: "none", path: "", alt: product.name, isPrimary: true }];

  const handleAdd = () => {
    if (!variant) return;
    add(product, variant, quantity);
    push(`${product.name} — ${variant.name} added to your pre-order cart.`, "success");
  };

  return (
    <div className="container-x py-8 sm:py-12">
      <nav className="text-xs font-medium text-ink/50" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-brand">Home</Link> <span className="mx-1">/</span>
        <Link to="/shop" className="hover:text-brand">Shop</Link> <span className="mx-1">/</span>
        <Link to={`/shop?category=${product.categorySlug}`} className="hover:text-brand">{product.categoryName}</Link>{" "}
        <span className="mx-1">/</span> <span className="text-ink">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div>
          <ProductImage
            src={gallery[activeImage]?.path}
            alt={gallery[activeImage]?.alt ?? product.name}
            className="aspect-square w-full rounded-2xl border border-ink/8"
            imgClassName="object-contain p-4 group-hover:scale-100"
          />
          {gallery.length > 1 && (
            <div className="mt-3 flex gap-3">
              {gallery.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`overflow-hidden rounded-lg border-2 ${index === activeImage ? "border-brand" : "border-transparent"}`}
                  aria-label={`View image ${index + 1}`}
                >
                  <img src={image.path} alt="" className="size-16 object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="section-eyebrow">{product.categoryName}</p>
          <h1 className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-2 text-sm font-semibold text-ink/60">
            {product.brandName} · {product.unitLabel}
          </p>

          <div className="mt-4">
            {effectivePrice !== null && product.priceStatus === "configured" ? (
              <p className="font-display text-3xl font-black">
                {formatPkr(effectivePrice)} <span className="text-sm font-medium text-ink/50">/ {product.unitLabel}</span>
              </p>
            ) : variant && variant.pricePkr !== null ? (
              <p className="font-display text-3xl font-black">
                {formatPkr(variant.pricePkr)} <span className="text-sm font-medium text-ink/50">/ {product.unitLabel}</span>
              </p>
            ) : (
              <p className="chip bg-brand-soft text-brand-dark">Price to be confirmed by Metro Lahore Kites</p>
            )}
          </div>

          {product.description && <p className="mt-5 leading-7 text-ink/75">{product.description}</p>}

          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-ink/10 bg-mist/60 p-5 text-sm">
            <div>
              <dt className="font-semibold text-ink/55">Type</dt>
              <dd className="mt-0.5 font-semibold">{product.categoryName}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink/55">Available sizes</dt>
              <dd className="mt-0.5 font-semibold">{product.sizeSummary || product.variants.map((v) => v.name).join(" · ")}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink/55">Brand</dt>
              <dd className="mt-0.5 font-semibold">{product.brandName}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink/55">Unit of sale</dt>
              <dd className="mt-0.5 font-semibold capitalize">{product.unit}</dd>
            </div>
          </dl>

          <div className="mt-6">
            <label htmlFor="product-variant" className="field-label">
              Choose size / variant <span className="text-brand">*</span>
            </label>
            <select
              id="product-variant"
              value={selectedVariantId}
              onChange={(event) => setSelectedVariantId(event.target.value)}
              className="field-input"
            >
              {product.variants.map((item) => (
                <option key={item.id} value={item.id} disabled={item.stockStatus !== "available"}>
                  {item.name}
                  {item.stockStatus !== "available" ? " — unavailable" : ""}
                </option>
              ))}
            </select>
            {variant?.sizeNote && <p className="mt-1.5 text-xs text-ink/55">{variant.sizeNote}</p>}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <QuantityStepper value={quantity} onChange={setQuantity} label={`${product.name} quantity`} />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!variant || variant.stockStatus !== "available" || !product.available}
              className="btn-primary flex-1 px-6 py-3"
            >
              Add to Pre-Order Cart
            </button>
          </div>
          <p className="mt-3 text-xs text-ink/55">
            No login or advance payment required — your pre-order is a request that our team confirms with you.
          </p>

          {settings.legal.notice && (
            <p className="mt-5 rounded-xl border border-ink/10 bg-mist/70 p-4 text-xs leading-5 text-ink/65">
              {settings.legal.notice}
            </p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-xl font-black">You may also like</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
