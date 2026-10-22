import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useToast } from "../components/Toast";
import { Skeleton } from "../components/ui";
import type { Product, Unit } from "../lib/types";

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  active: number;
}

interface BrandRow {
  id: string;
  slug: string;
  name: string;
  is_store_brand: number;
  active: number;
}

interface VariantDraft {
  key: string;
  name: string;
  sizeNote: string;
  price: string;
  stockStatus: "available" | "unavailable";
  sortOrder: number;
}

const UNITS: Array<{ value: Unit; label: string }> = [
  { value: "piece", label: "Per piece" },
  { value: "dozen", label: "Per dozen" },
  { value: "set", label: "Per set" },
  { value: "pair", label: "Per pair" },
];

const PRODUCT_STATUSES = ["active", "inactive", "archived"] as const;

function newDraft(sortOrder: number): VariantDraft {
  return {
    key: `draft_${Date.now().toString(36)}_${sortOrder}_${Math.random().toString(36).slice(2, 6)}`,
    name: "",
    sizeNote: "",
    price: "",
    stockStatus: "available",
    sortOrder,
  };
}

export function AdminProductFormPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { push } = useToast();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [unit, setUnit] = useState<Unit>("piece");
  const [description, setDescription] = useState("");
  const [sizeSummary, setSizeSummary] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<Product["status"]>("active");
  const [preorderOnly, setPreorderOnly] = useState(true);
  const [variants, setVariants] = useState<VariantDraft[]>([newDraft(0)]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    api<{ ok: true; items: CategoryRow[] }>("/api/admin/categories")
      .then((data) => setCategories(data.items.filter((item) => item.active === 1)))
      .catch(() => undefined);
    api<{ ok: true; items: BrandRow[] }>("/api/admin/brands")
      .then((data) => setBrands(data.items.filter((item) => item.active === 1)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (isNew) return;
    api<{ ok: true; product: Product }>(`/api/admin/products/${id}`)
      .then((data) => {
        const loaded = data.product;
        setProduct(loaded);
        setName(loaded.name);
        setSlug(loaded.slug);
        setCategoryId(loaded.categoryId);
        setBrandId(loaded.brandId);
        setUnit(loaded.unit);
        setDescription(loaded.description);
        setSizeSummary(loaded.sizeSummary);
        setPrice(loaded.pricePkr !== null ? String(loaded.pricePkr) : "");
        setStatus(loaded.status);
        setPreorderOnly(loaded.preorderOnly);
        setVariants(
          loaded.variants.map((variant, index) => ({
            key: variant.id,
            name: variant.name,
            sizeNote: variant.sizeNote,
            price: variant.pricePkr !== null ? String(variant.pricePkr) : "",
            stockStatus: variant.stockStatus,
            sortOrder: variant.sortOrder ?? index,
          })),
        );
      })
      .catch((error) => push(error instanceof ApiError ? error.message : "Could not load the product.", "error"))
      .finally(() => setLoading(false));
  }, [id, isNew, push]);

  const updateVariant = (index: number, patch: Partial<VariantDraft>) => {
    setVariants((current) => current.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    const payload = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      categoryId,
      brandId,
      unit,
      description: description.trim(),
      sizeSummary: sizeSummary.trim(),
      pricePkr: price.trim() === "" ? null : Number(price),
      status,
      preorderOnly,
      variants: variants
        .filter((variant) => variant.name.trim())
        .map((variant, index) => ({
          name: variant.name.trim(),
          sizeNote: variant.sizeNote.trim(),
          pricePkr: variant.price.trim() === "" ? null : Number(variant.price),
          stockStatus: variant.stockStatus,
          sortOrder: variant.sortOrder || index,
        })),
    };
    try {
      if (isNew) {
        const data = await api<{ ok: true; product: Product }>("/api/admin/products", { method: "POST", body: payload });
        push("Product created.", "success");
        navigate(`/admin/products/${data.product.id}`, { replace: true });
      } else {
        const data = await api<{ ok: true; product: Product }>(`/api/admin/products/${id}`, {
          method: "PATCH",
          body: payload,
        });
        setProduct(data.product);
        push("Product saved.", "success");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        push(error.message, "error");
      } else {
        push("Could not save the product.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file: File) => {
    if (!id || isNew) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const data = await api<{ ok: true; product: Product }>(`/api/admin/products/${id}/images`, {
        method: "POST",
        formData,
      });
      setProduct(data.product);
      push("Image uploaded.", "success");
    } catch (error) {
      push(error instanceof ApiError ? error.message : "Upload failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (imageId: string) => {
    if (!window.confirm("Remove this image?")) return;
    try {
      await api(`/api/admin/products/images/${imageId}`, { method: "DELETE" });
      if (product) {
        setProduct({ ...product, images: product.images.filter((image) => image.id !== imageId) });
      }
      push("Image removed.", "success");
    } catch (error) {
      push(error instanceof ApiError ? error.message : "Could not remove the image.", "error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div>
      <Link to="/admin/products" className="text-sm font-semibold text-ink/55 hover:underline">
        ← Products
      </Link>
      <h1 className="mt-1 font-display text-2xl font-black">{isNew ? "Add product" : `Edit: ${product?.name ?? ""}`}</h1>

      <form onSubmit={(event) => void save(event)} className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card space-y-4 p-6">
            <h2 className="font-display text-lg font-black">Details</h2>
            <div>
              <label htmlFor="product-name" className="field-label">
                Name <span className="text-brand">*</span>
              </label>
              <input
                id="product-name"
                className="field-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Patang Adda 1 Tawa"
                required
              />
              {errors.name ? <p className="field-error">{errors.name}</p> : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="product-slug" className="field-label">
                  URL slug (optional)
                </label>
                <input
                  id="product-slug"
                  className="field-input font-mono"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  placeholder="auto-generated from the name"
                  pattern="[a-z0-9-]*"
                />
                {errors.slug ? <p className="field-error">{errors.slug}</p> : null}
              </div>
              <div>
                <label htmlFor="product-unit" className="field-label">
                  Unit
                </label>
                <select id="product-unit" className="field-input" value={unit} onChange={(event) => setUnit(event.target.value as Unit)}>
                  {UNITS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="product-description" className="field-label">
                Description
              </label>
              <textarea
                id="product-description"
                className="field-input min-h-28"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the kite, materials and what makes it stand out."
              />
            </div>
            <div>
              <label htmlFor="product-size-summary" className="field-label">
                Size summary
              </label>
              <input
                id="product-size-summary"
                className="field-input"
                value={sizeSummary}
                onChange={(event) => setSizeSummary(event.target.value)}
                placeholder="e.g. 0.5 Tawa to 1.5 Tawa"
              />
            </div>
          </section>

          <section className="card space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-black">Variants</h2>
              <button
                type="button"
                className="btn-outline text-sm"
                onClick={() => setVariants((current) => [...current, newDraft(current.length)])}
              >
                Add variant
              </button>
            </div>
            <p className="text-xs text-ink/55">
              Every product needs at least one size/variant. Leave a price empty to show “Price to be confirmed”.
            </p>
            {errors.variants ? <p className="field-error">{errors.variants}</p> : null}
            <div className="space-y-3">
              {variants.map((variant, index) => (
                <div key={variant.key} className="rounded-xl border border-ink/10 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`variant-name-${index}`} className="field-label">
                        Variant name <span className="text-brand">*</span>
                      </label>
                      <input
                        id={`variant-name-${index}`}
                        className="field-input"
                        value={variant.name}
                        onChange={(event) => updateVariant(index, { name: event.target.value })}
                        placeholder="e.g. 1 Tawa"
                      />
                    </div>
                    <div>
                      <label htmlFor={`variant-size-${index}`} className="field-label">
                        Size note
                      </label>
                      <input
                        id={`variant-size-${index}`}
                        className="field-input"
                        value={variant.sizeNote}
                        onChange={(event) => updateVariant(index, { sizeNote: event.target.value })}
                        placeholder="e.g. approx. 32 × 32 in"
                      />
                    </div>
                    <div>
                      <label htmlFor={`variant-price-${index}`} className="field-label">
                        Price (PKR, optional)
                      </label>
                      <input
                        id={`variant-price-${index}`}
                        type="number"
                        min="0"
                        className="field-input"
                        value={variant.price}
                        onChange={(event) => updateVariant(index, { price: event.target.value })}
                        placeholder="Leave empty — price to be confirmed"
                      />
                    </div>
                    <div>
                      <label htmlFor={`variant-stock-${index}`} className="field-label">
                        Availability
                      </label>
                      <select
                        id={`variant-stock-${index}`}
                        className="field-input"
                        value={variant.stockStatus}
                        onChange={(event) =>
                          updateVariant(index, { stockStatus: event.target.value as VariantDraft["stockStatus"] })
                        }
                      >
                        <option value="available">Available</option>
                        <option value="unavailable">Unavailable</option>
                      </select>
                    </div>
                  </div>
                  {variants.length > 1 ? (
                    <button
                      type="button"
                      className="btn-ghost mt-2 text-xs text-brand"
                      onClick={() => setVariants((current) => current.filter((_, i) => i !== index))}
                    >
                      Remove variant
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card space-y-4 p-6">
            <h2 className="font-display text-lg font-black">Organisation</h2>
            <div>
              <label htmlFor="product-category" className="field-label">
                Category <span className="text-brand">*</span>
              </label>
              <select
                id="product-category"
                className="field-input"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                required
              >
                <option value="">Select a category…</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId ? <p className="field-error">{errors.categoryId}</p> : null}
            </div>
            <div>
              <label htmlFor="product-brand" className="field-label">
                Brand <span className="text-brand">*</span>
              </label>
              <select
                id="product-brand"
                className="field-input"
                value={brandId}
                onChange={(event) => setBrandId(event.target.value)}
                required
              >
                <option value="">Select a brand…</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              {errors.brandId ? <p className="field-error">{errors.brandId}</p> : null}
            </div>
            <div>
              <label htmlFor="product-status" className="field-label">
                Status
              </label>
              <select
                id="product-status"
                className="field-input"
                value={status}
                onChange={(event) => setStatus(event.target.value as Product["status"])}
              >
                {PRODUCT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={preorderOnly}
                onChange={(event) => setPreorderOnly(event.target.checked)}
                className="size-4 accent-[#e30613]"
              />
              Pre-order only (never sold as immediate stock)
            </label>
          </section>

          <section className="card space-y-4 p-6">
            <h2 className="font-display text-lg font-black">Images</h2>
            {product && product.images.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {product.images.map((image, index) => (
                  <div key={image.id} className="relative">
                    <img
                      src={image.path}
                      alt={image.alt}
                      className="aspect-square w-full rounded-lg border border-ink/10 bg-mist object-contain"
                      loading="lazy"
                    />
                    {index === 0 ? <span className="chip absolute left-1 top-1 bg-ink/80 text-[10px] text-white">Primary</span> : null}
                    <button
                      type="button"
                      className="btn-ghost mt-1 w-full text-xs text-brand"
                      onClick={() => void removeImage(image.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink/55">
                {isNew ? "Save the product first, then add images." : "No images yet."}
              </p>
            )}
            {!isNew ? (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/webp,image/png,image/jpeg,image/avif,image/svg+xml"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadImage(file);
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className="btn-outline w-full text-sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? "Uploading…" : "Upload image"}
                </button>
              </>
            ) : null}
          </section>

          <section className="card space-y-4 p-6">
            <h2 className="font-display text-lg font-black">Base price</h2>
            <div>
              <label htmlFor="product-price" className="field-label">
                Price (PKR, optional)
              </label>
              <input
                id="product-price"
                type="number"
                min="0"
                className="field-input"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="Leave empty — price to be confirmed"
              />
              <p className="mt-1.5 text-xs text-ink/50">Variant prices normally override this. Empty = “Price to be confirmed”.</p>
            </div>
          </section>

          <div className="flex gap-3">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? "Saving…" : isNew ? "Create product" : "Save changes"}
            </button>
            <Link to="/admin/products" className="btn-ghost">
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
