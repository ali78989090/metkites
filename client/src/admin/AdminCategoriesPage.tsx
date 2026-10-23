import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "../lib/api";
import { useToast } from "../components/Toast";
import { Field, Input, Textarea, Spinner } from "../components/ui";

interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  image_path: string | null;
  sort_order: number;
  active: number;
}

interface Brand {
  id: string;
  slug: string;
  name: string;
  is_store_brand: number;
  active: number;
}

export function AdminCategoriesPage() {
  const { push } = useToast();
  const [tab, setTab] = useState<"categories" | "brands">("categories");

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({
    name: "",
    slug: "",
    description: "",
    imagePath: "",
    sortOrder: 0,
    active: true,
  });

  // Brands state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandLoading, setBrandLoading] = useState(true);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [brandForm, setBrandForm] = useState({
    name: "",
    slug: "",
    isStoreBrand: false,
    active: true,
  });

  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(() => {
    setCatLoading(true);
    api<{ ok: true; items: Category[] }>("/api/admin/categories")
      .then((res) => setCategories(res.items))
      .catch((err) => push(err instanceof ApiError ? err.message : "Failed to load categories.", "error"))
      .finally(() => setCatLoading(false));
  }, [push]);

  const loadBrands = useCallback(() => {
    setBrandLoading(true);
    api<{ ok: true; items: Brand[] }>("/api/admin/brands")
      .then((res) => setBrands(res.items))
      .catch((err) => push(err instanceof ApiError ? err.message : "Failed to load brands.", "error"))
      .finally(() => setBrandLoading(false));
  }, [push]);

  useEffect(() => {
    loadCategories();
    loadBrands();
  }, [loadCategories, loadBrands]);

  // Open Category Create
  const openNewCategory = () => {
    setEditingCat(null);
    setCatForm({
      name: "",
      slug: "",
      description: "",
      imagePath: "",
      sortOrder: categories.length + 1,
      active: true,
    });
    setIsCatModalOpen(true);
  };

  // Open Category Edit
  const openEditCategory = (cat: Category) => {
    setEditingCat(cat);
    setCatForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      imagePath: cat.image_path || "",
      sortOrder: cat.sort_order,
      active: Boolean(cat.active),
    });
    setIsCatModalOpen(true);
  };

  // Save Category
  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;
    setSaving(true);
    try {
      if (editingCat) {
        await api(`/api/admin/categories/${editingCat.id}`, {
          method: "PATCH",
          body: {
            name: catForm.name.trim(),
            slug: catForm.slug.trim() || undefined,
            description: catForm.description.trim(),
            imagePath: catForm.imagePath.trim() || null,
            sortOrder: Number(catForm.sortOrder),
            active: catForm.active,
          },
        });
        push("Category updated successfully.", "success");
      } else {
        await api("/api/admin/categories", {
          method: "POST",
          body: {
            name: catForm.name.trim(),
            slug: catForm.slug.trim() || undefined,
            description: catForm.description.trim(),
            imagePath: catForm.imagePath.trim() || null,
            sortOrder: Number(catForm.sortOrder),
            active: catForm.active,
          },
        });
        push("Category created successfully.", "success");
      }
      setIsCatModalOpen(false);
      loadCategories();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Failed to save category.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Category Active Status
  const toggleCatStatus = async (cat: Category) => {
    try {
      await api(`/api/admin/categories/${cat.id}`, {
        method: "PATCH",
        body: { active: !cat.active },
      });
      push(`Category ${cat.active ? "deactivated" : "activated"}.`, "success");
      loadCategories();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Failed to update category status.", "error");
    }
  };

  // Open Brand Create
  const openNewBrand = () => {
    setEditingBrand(null);
    setBrandForm({
      name: "",
      slug: "",
      isStoreBrand: false,
      active: true,
    });
    setIsBrandModalOpen(true);
  };

  // Open Brand Edit
  const openEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    setBrandForm({
      name: brand.name,
      slug: brand.slug,
      isStoreBrand: Boolean(brand.is_store_brand),
      active: Boolean(brand.active),
    });
    setIsBrandModalOpen(true);
  };

  // Save Brand
  const saveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandForm.name.trim()) return;
    setSaving(true);
    try {
      if (editingBrand) {
        await api(`/api/admin/brands/${editingBrand.id}`, {
          method: "PATCH",
          body: {
            name: brandForm.name.trim(),
            slug: brandForm.slug.trim() || undefined,
            isStoreBrand: brandForm.isStoreBrand,
            active: brandForm.active,
          },
        });
        push("Brand updated successfully.", "success");
      } else {
        await api("/api/admin/brands", {
          method: "POST",
          body: {
            name: brandForm.name.trim(),
            slug: brandForm.slug.trim() || undefined,
            isStoreBrand: brandForm.isStoreBrand,
            active: brandForm.active,
          },
        });
        push("Brand created successfully.", "success");
      }
      setIsBrandModalOpen(false);
      loadBrands();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Failed to save brand.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Brand Active Status
  const toggleBrandStatus = async (brand: Brand) => {
    try {
      await api(`/api/admin/brands/${brand.id}`, {
        method: "PATCH",
        body: { active: !brand.active },
      });
      push(`Brand ${brand.active ? "deactivated" : "activated"}.`, "success");
      loadBrands();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Failed to update brand status.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-black text-ink sm:text-3xl">Categories & Brands</h1>
          <p className="mt-1 text-sm text-ink/60">
            Manage catalogue classifications, sort priority, and brand options available for pre-orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "categories" ? (
            <button type="button" onClick={openNewCategory} className="btn-brand text-sm">
              + New Category
            </button>
          ) : (
            <button type="button" onClick={openNewBrand} className="btn-brand text-sm">
              + New Brand
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ink/10">
        <button
          type="button"
          onClick={() => setTab("categories")}
          className={`border-b-2 px-5 py-2.5 text-sm font-bold transition-colors ${
            tab === "categories" ? "border-brand text-brand" : "border-transparent text-ink/60 hover:text-ink"
          }`}
        >
          Categories ({categories.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("brands")}
          className={`border-b-2 px-5 py-2.5 text-sm font-bold transition-colors ${
            tab === "brands" ? "border-brand text-brand" : "border-transparent text-ink/60 hover:text-ink"
          }`}
        >
          Brands ({brands.length})
        </button>
      </div>

      {/* Categories View */}
      {tab === "categories" && (
        <div className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-sm">
          {catLoading ? (
            <div className="py-12 text-center text-ink/50">
              <Spinner className="size-6 text-brand" />
              <p className="mt-2 text-sm">Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="py-12 text-center text-ink/50">No categories found.</div>
          ) : (
            <table className="min-w-full divide-y divide-ink/8 text-left text-sm">
              <thead className="bg-mist/80 text-xs font-bold uppercase tracking-wider text-ink/60">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-center">Order</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/8">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-mist/30">
                    <td className="px-4 py-3 font-semibold text-ink">
                      <div className="flex items-center gap-3">
                        {cat.image_path ? (
                          <img src={cat.image_path} alt={cat.name} className="size-9 rounded-md object-cover border border-ink/10" />
                        ) : (
                          <div className="size-9 rounded-md bg-mist flex items-center justify-center text-xs font-bold text-ink/40">
                            {cat.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span>{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink/60">{cat.slug}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-xs text-ink/70" title={cat.description}>
                      {cat.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{cat.sort_order}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          cat.active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {cat.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openEditCategory(cat)}
                        className="rounded px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-soft"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCatStatus(cat)}
                        className="rounded px-2.5 py-1 text-xs font-semibold text-ink/60 hover:bg-mist"
                      >
                        {cat.active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Brands View */}
      {tab === "brands" && (
        <div className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-sm">
          {brandLoading ? (
            <div className="py-12 text-center text-ink/50">
              <Spinner className="size-6 text-brand" />
              <p className="mt-2 text-sm">Loading brands...</p>
            </div>
          ) : brands.length === 0 ? (
            <div className="py-12 text-center text-ink/50">No brands found.</div>
          ) : (
            <table className="min-w-full divide-y divide-ink/8 text-left text-sm">
              <thead className="bg-mist/80 text-xs font-bold uppercase tracking-wider text-ink/60">
                <tr>
                  <th className="px-4 py-3">Brand Name</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3 text-center">Type</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/8">
                {brands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-mist/30">
                    <td className="px-4 py-3 font-semibold text-ink">{brand.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink/60">{brand.slug}</td>
                    <td className="px-4 py-3 text-center">
                      {brand.is_store_brand ? (
                        <span className="inline-flex items-center rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-dark">
                          Store Brand
                        </span>
                      ) : (
                        <span className="text-xs text-ink/50">Partner Brand</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          brand.active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {brand.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openEditBrand(brand)}
                        className="rounded px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-soft"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleBrandStatus(brand)}
                        className="rounded px-2.5 py-1 text-xs font-semibold text-ink/60 hover:bg-mist"
                      >
                        {brand.active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Category Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="font-display text-xl font-bold text-ink">
              {editingCat ? "Edit Category" : "New Category"}
            </h2>
            <form onSubmit={saveCategory} className="mt-4 space-y-4">
              <Field label="Category Name" htmlFor="cat-name" required>
                <Input
                  id="cat-name"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="e.g. Traditional Gudda"
                  required
                />
              </Field>
              <Field label="Slug (optional URL identifier)" htmlFor="cat-slug">
                <Input
                  id="cat-slug"
                  value={catForm.slug}
                  onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                  placeholder="e.g. traditional-gudda"
                />
              </Field>
              <Field label="Description" htmlFor="cat-desc">
                <Textarea
                  id="cat-desc"
                  rows={2}
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  placeholder="Short explanation displayed on shop filters..."
                />
              </Field>
              <Field label="Image Path or URL" htmlFor="cat-img">
                <Input
                  id="cat-img"
                  value={catForm.imagePath}
                  onChange={(e) => setCatForm({ ...catForm, imagePath: e.target.value })}
                  placeholder="/img/categories/gudda.webp"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sort Order" htmlFor="cat-order">
                  <Input
                    id="cat-order"
                    type="number"
                    value={catForm.sortOrder}
                    onChange={(e) => setCatForm({ ...catForm, sortOrder: Number(e.target.value) })}
                  />
                </Field>
                <div className="flex flex-col justify-center pt-5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={catForm.active}
                      onChange={(e) => setCatForm({ ...catForm, active: e.target.checked })}
                      className="size-4 rounded text-brand focus:ring-brand"
                    />
                    Active on Store
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="rounded-lg border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/70 hover:bg-mist"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-brand text-sm">
                  {saving ? "Saving..." : editingCat ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Brand Modal */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="font-display text-xl font-bold text-ink">
              {editingBrand ? "Edit Brand" : "New Brand"}
            </h2>
            <form onSubmit={saveBrand} className="mt-4 space-y-4">
              <Field label="Brand Name" htmlFor="brand-name" required>
                <Input
                  id="brand-name"
                  value={brandForm.name}
                  onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                  placeholder="e.g. Metro Lahore Kites"
                  required
                />
              </Field>
              <Field label="Slug (optional)" htmlFor="brand-slug">
                <Input
                  id="brand-slug"
                  value={brandForm.slug}
                  onChange={(e) => setBrandForm({ ...brandForm, slug: e.target.value })}
                  placeholder="e.g. metro-lahore-kites"
                />
              </Field>
              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={brandForm.isStoreBrand}
                    onChange={(e) => setBrandForm({ ...brandForm, isStoreBrand: e.target.checked })}
                    className="size-4 rounded text-brand focus:ring-brand"
                  />
                  Is Official Store Brand
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={brandForm.active}
                    onChange={(e) => setBrandForm({ ...brandForm, active: e.target.checked })}
                    className="size-4 rounded text-brand focus:ring-brand"
                  />
                  Active for Pre-Orders
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(false)}
                  className="rounded-lg border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/70 hover:bg-mist"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-brand text-sm">
                  {saving ? "Saving..." : editingBrand ? "Update Brand" : "Create Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
