import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

type Category = { id: number; name: string };

type VariantForm = {
  sku: string;
  name: string;
  price: string; // keep as string for input handling
  inventory: string;
};

export default function CreateProductPage() {
  const navigate = useNavigate();

  // Product fields
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "draft">("active");
  const [categoryId, setCategoryId] = useState<number | "">("");

  // Variants (start with 1 blank variant)
  const [variants, setVariants] = useState<VariantForm[]>([
    { sku: "", name: "", price: "0", inventory: "0" },
  ]);

  // Categories (optional but nice)
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load categories (if endpoint exists)
 useEffect(() => {
  let ignore = false;

  async function load() {
    setLoadingCategories(true);
    try {
      const res = await fetch("http://localhost:3001/api/categories");
      if (!res.ok) throw new Error(`Failed to load categories: ${res.status}`);
      const data = await res.json();
      if (!ignore) setCategories(Array.isArray(data) ? data : []);
    } catch {
      if (!ignore) setCategories([]);
    } finally {
      if (!ignore) setLoadingCategories(false);
    }
  }

  load();
  return () => {
    ignore = true;
  };
}, []);

  // Client-side validation
  const validationError = useMemo(() => {
    if (!productName.trim()) return "Product name is required.";
    if (variants.length < 1) return "At least one variant is required.";

    const seen = new Set<string>();
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.sku.trim()) return `Variant #${i + 1}: SKU is required.`;
      const skuKey = v.sku.trim().toLowerCase();
      if (seen.has(skuKey)) return `Variant #${i + 1}: SKU must be unique (duplicate SKU).`;
      seen.add(skuKey);

      if (!v.name.trim()) return `Variant #${i + 1}: Variant name is required.`;

      const price = Number(v.price);
      if (Number.isNaN(price)) return `Variant #${i + 1}: Price must be a number.`;
      if (price < 0) return `Variant #${i + 1}: Price must be ≥ 0.`;

      const inv = Number(v.inventory);
      if (Number.isNaN(inv)) return `Variant #${i + 1}: Inventory must be a number.`;
      if (inv < 0) return `Variant #${i + 1}: Inventory must be ≥ 0.`;
    }

    return null;
  }, [productName, variants]);

  function updateVariant(index: number, patch: Partial<VariantForm>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function addVariant() {
    setVariants((prev) => [...prev, { sku: "", name: "", price: "0", inventory: "0" }]);
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (validationError) {
      setError(validationError);
      return;
    }

    // Build payload to match DB schema:
    // variants expects: sku, name, price_cents, inventory_count
    const payload = {
      name: productName.trim(),
      description: description.trim() ? description.trim() : null,
      status,
      category_id: categoryId === "" ? null : categoryId,
      variants: variants.map((v) => ({
        sku: v.sku.trim(),
        name: v.name.trim(),
        price_cents: Math.round(Number(v.price) * 100),
        inventory_count: Math.round(Number(v.inventory)),
      })),
    };

    try {
      setIsSaving(true);
      const res = await fetch("http://localhost:3001/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = (data && (data.error || data.message)) || "Failed to create product.";
        throw new Error(msg);
      }

      // We expect backend to return the created product (or at least an id)
      const newId = data?.id ?? data?.product?.id;
      if (newId) {
        navigate(`/products/${newId}`);
      } else {
        // fallback: go back to products list
        navigate("/products");
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <Link
        to="/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Link>

      <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        Create New Product
      </h1>

      <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-6 shadow-card">
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Product fields */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Product name<span className="text-red-500">*</span></label>
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              placeholder="e.g. Sumo Citrus"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              placeholder="e.g. A hybrid mix between a mandarin, satsuma, and an orange. It is incredibly sweet, juicy, seedless, and uniquely easy-to-peel."
              rows={3}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "draft")}
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="active">active</option>
              <option value="draft">draft</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <select
              value={categoryId}
              onChange={(e) => {
                const v = e.target.value;
                setCategoryId(v === "" ? "" : Number(v));
              }}
              className="w-full rounded-md border px-3 py-2"
              disabled={loadingCategories && categories.length === 0}
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {loadingCategories && (
              <div className="mt-1 text-xs text-muted-foreground">Loading categories…</div>
            )}
          </div>
        </div>

        {/* Variants */}
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Variants<span className="text-red-500">*</span></h2>
            <button
              type="button"
              onClick={addVariant}
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              + Add variant
            </button>
          </div>

          <div className="space-y-4">
            {variants.map((v, idx) => (
              <div key={idx} className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-medium">Variant #{idx + 1}</div>
                  <button
                    type="button"
                    onClick={() => removeVariant(idx)}
                    disabled={variants.length === 1}
                    className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                    title={variants.length === 1 ? "At least one variant is required" : "Remove"}
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">SKU<span className="text-red-500">*</span></label>
                    <input
                      value={v.sku}
                      onChange={(e) => updateVariant(idx, { sku: e.target.value })}
                      className="w-full rounded-md border px-3 py-2"
                      placeholder="e.g. SUMO-5LB"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Variant name<span className="text-red-500">*</span></label>
                    <input
                      value={v.name}
                      onChange={(e) => updateVariant(idx, { name: e.target.value })}
                      className="w-full rounded-md border px-3 py-2"
                      placeholder="e.g. 5lb box"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Price (USD)<span className="text-red-500">*</span></label>
                    <input
                      value={v.price}
                      onChange={(e) => updateVariant(idx, { price: e.target.value })}
                      className="w-full rounded-md border px-3 py-2"
                      type="number"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Inventory<span className="text-red-500">*</span></label>
                    <input
                      value={v.inventory}
                      onChange={(e) => updateVariant(idx, { inventory: e.target.value })}
                      className="w-full rounded-md border px-3 py-2"
                      type="number"
                      min="0"
                      step="1"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="mt-8 flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {isSaving ? "Creating..." : "Create Product"}
          </button>

          {validationError && !error && (
            <div className="text-sm text-muted-foreground">{validationError}</div>
          )}
        </div>
      </form>
    </div>
  );
}