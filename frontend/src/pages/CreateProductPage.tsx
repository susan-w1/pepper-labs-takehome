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

type FieldErrors = Record<string, string>;

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

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Field-level errors (new)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Helpers
  const inputClass = (hasError: boolean) =>
    [
      "w-full rounded-md border px-3 py-2",
      hasError ? "border-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" : "",
    ].join(" ");

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  // Load categories
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

  // Validate ALL fields (new)
  const allFieldErrors = useMemo(() => {
    const errs: FieldErrors = {};

    if (!productName.trim()) errs.productName = "Product name is required.";

    if (variants.length < 1) {
      errs.variants = "At least one variant is required.";
      return errs;
    }

    const seenSkus = new Set<string>();

    variants.forEach((v, i) => {
      const skuKey = `variants.${i}.sku`;
      const nameKey = `variants.${i}.name`;
      const priceKey = `variants.${i}.price`;
      const invKey = `variants.${i}.inventory`;

      // SKU required + unique
      if (!v.sku.trim()) {
        errs[skuKey] = "SKU is required.";
      } else {
        const normalized = v.sku.trim().toLowerCase();
        if (seenSkus.has(normalized)) {
          errs[skuKey] = "SKU must be unique.";
        }
        seenSkus.add(normalized);
      }

      // Variant name required
      if (!v.name.trim()) errs[nameKey] = "Variant name is required.";

      // Price >= 0
      const price = Number(v.price);
      if (Number.isNaN(price)) errs[priceKey] = "Price must be a number.";
      else if (price < 0) errs[priceKey] = "Price must be ≥ 0.";

      // Inventory >= 0
      const inv = Number(v.inventory);
      if (Number.isNaN(inv)) errs[invKey] = "Inventory must be a number.";
      else if (inv < 0) errs[invKey] = "Inventory must be ≥ 0.";
    });

    return errs;
  }, [productName, variants]);

  function updateVariant(index: number, patch: Partial<VariantForm>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function addVariant() {
    setVariants((prev) => [...prev, { sku: "", name: "", price: "0", inventory: "0" }]);
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
    // also clear any old errors for this index to avoid “stale” errors
    setFieldErrors((prev) => {
      const copy: FieldErrors = {};
      Object.entries(prev).forEach(([k, v]) => {
        if (!k.startsWith(`variants.${index}.`)) copy[k] = v;
      });
      return copy;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // reset top error
    setError(null);

    // compute errors and show them
    setFieldErrors(allFieldErrors);

    if (Object.keys(allFieldErrors).length > 0) {
      setError("Please fix the highlighted fields.");
      return;
    }

    // Build payload
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

      const newId = data?.id ?? data?.product?.id;
      if (newId) navigate(`/products/${newId}`);
      else navigate("/products");
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
            <label className="mb-1 block text-sm font-medium">
              Product name<span className="text-red-500">*</span>
            </label>
            <input
              value={productName}
              onChange={(e) => {
                setProductName(e.target.value);
                clearFieldError("productName");
              }}
              className={inputClass(!!fieldErrors.productName)}
              aria-invalid={!!fieldErrors.productName}
              placeholder="e.g. Sumo Citrus"
            />
            {fieldErrors.productName && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.productName}</p>
            )}
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
            <h2 className="text-lg font-semibold">
              Variants<span className="text-red-500">*</span>
            </h2>
            <button
              type="button"
              onClick={addVariant}
              className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              + Add variant
            </button>
          </div>

          {fieldErrors.variants && (
            <p className="mb-3 text-sm text-red-600">{fieldErrors.variants}</p>
          )}

          <div className="space-y-4">
            {variants.map((v, idx) => {
              const skuKey = `variants.${idx}.sku`;
              const nameKey = `variants.${idx}.name`;
              const priceKey = `variants.${idx}.price`;
              const invKey = `variants.${idx}.inventory`;

              return (
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
                      <label className="mb-1 block text-sm font-medium">
                        SKU<span className="text-red-500">*</span>
                      </label>
                      <input
                        value={v.sku}
                        onChange={(e) => {
                          updateVariant(idx, { sku: e.target.value });
                          clearFieldError(skuKey);
                        }}
                        className={inputClass(!!fieldErrors[skuKey])}
                        aria-invalid={!!fieldErrors[skuKey]}
                        placeholder="e.g. SUMO-5LB"
                      />
                      {fieldErrors[skuKey] && (
                        <p className="mt-1 text-xs text-red-600">{fieldErrors[skuKey]}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Variant name<span className="text-red-500">*</span>
                      </label>
                      <input
                        value={v.name}
                        onChange={(e) => {
                          updateVariant(idx, { name: e.target.value });
                          clearFieldError(nameKey);
                        }}
                        className={inputClass(!!fieldErrors[nameKey])}
                        aria-invalid={!!fieldErrors[nameKey]}
                        placeholder="e.g. 5lb box"
                      />
                      {fieldErrors[nameKey] && (
                        <p className="mt-1 text-xs text-red-600">{fieldErrors[nameKey]}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Price (USD)<span className="text-red-500">*</span>
                      </label>
                      <input
                        value={v.price}
                        onChange={(e) => {
                          updateVariant(idx, { price: e.target.value });
                          clearFieldError(priceKey);
                        }}
                        className={inputClass(!!fieldErrors[priceKey])}
                        aria-invalid={!!fieldErrors[priceKey]}
                        type="number"
                        min="0"
                        step="0.01"
                      />
                      {fieldErrors[priceKey] && (
                        <p className="mt-1 text-xs text-red-600">{fieldErrors[priceKey]}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Inventory<span className="text-red-500">*</span>
                      </label>
                      <input
                        value={v.inventory}
                        onChange={(e) => {
                          updateVariant(idx, { inventory: e.target.value });
                          clearFieldError(invKey);
                        }}
                        className={inputClass(!!fieldErrors[invKey])}
                        aria-invalid={!!fieldErrors[invKey]}
                        type="number"
                        min="0"
                        step="1"
                      />
                      {fieldErrors[invKey] && (
                        <p className="mt-1 text-xs text-red-600">{fieldErrors[invKey]}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
        </div>
      </form>
    </div>
  );
}