import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Package } from "lucide-react";
import { fetchProduct, deleteProduct } from "@/lib/api";
import type { ProductDetail, Variant } from "@/types";
import { formatPrice, cn } from "@/lib/utils";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchProduct(Number(id))
      .then((r) => r.json())
      .then(setProduct)
      .catch(console.error);
  }, [id]);

  const handleVariantUpdated = (updated: Variant) => {
    setProduct((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        variants: prev.variants.map((v) => (v.id === updated.id ? updated : v)),
      };
    });
  };

  // Delete handler — sends soft-delete request.
  // FIXME: The button does not disable while the request is in flight,
  //        so rapid clicks can send multiple DELETE requests.
  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    await deleteProduct(Number(id));
    navigate("/products");
  };

  if (!product) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <Link
        to="/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Link>

      {/* Product header — card style */}
      <div className="mb-6 rounded-lg border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {product.name}
            </h1>
            {product.description && (
              <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  product.status === "active"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : product.status === "draft"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-gray-200 bg-gray-100 text-gray-600"
                )}
              >
                {product.status}
              </span>
              {product.category_name && (
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {product.category_name}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Variants table — card wrapped like CatalogList */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Variants ({product.variants.length})
        </h2>

        <div className="overflow-hidden rounded-lg border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b bg-muted/50 transition-colors">
                  <th className="h-12 px-4 text-left align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    SKU
                  </th>
                  <th className="h-12 px-4 text-left align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Name
                  </th>
                  <th className="h-12 px-4 text-right align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Price
                  </th>
                  <th className="h-12 px-4 text-right align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Inventory
                  </th>
                  <th className="h-12 px-4 text-right align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {product.variants.map((v) => (
                  <VariantRow key={v.id} variant={v} onUpdated={handleVariantUpdated} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function VariantRow({
  variant,
  onUpdated,
}: {
  variant: Variant;
  onUpdated: (v: Variant) => void;
}) {
  const lowStock = variant.inventory_count > 0 && variant.inventory_count <= 10;
  const outOfStock = variant.inventory_count === 0;

  const [isEditing, setIsEditing] = useState(false);
  const [price, setPrice] = useState((variant.price_cents / 100).toFixed(2));
  const [inventory, setInventory] = useState(String(variant.inventory_count));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrice((variant.price_cents / 100).toFixed(2));
    setInventory(String(variant.inventory_count));
  }, [variant.price_cents, variant.inventory_count]);

  const save = async () => {
    setError(null);

    const priceNumber = Number(price);
    const inventoryNumber = Number(inventory);

    if (Number.isNaN(priceNumber) || priceNumber < 0) {
      setError("Price must be a number ≥ 0.");
      return;
    }

    if (!Number.isInteger(inventoryNumber) || inventoryNumber < 0) {
      setError("Inventory must be an integer ≥ 0.");
      return;
    }

    const payload = {
      price_cents: Math.round(priceNumber * 100),
      inventory_count: inventoryNumber,
    };

    try {
      setSaving(true);
      const res = await fetch(`http://localhost:3001/api/variants/${variant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to update variant.");

      onUpdated(data as Variant);
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-b transition-colors hover:bg-muted/50">
      <td className="p-4 align-middle font-mono text-xs">{variant.sku}</td>
      <td className="p-4 align-middle font-medium">{variant.name}</td>

      <td className="p-4 text-right align-middle tabular-nums">
        {isEditing ? (
          <input
            className="w-24 rounded-md border px-2 py-1 text-right"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={saving}
          />
        ) : (
          formatPrice(variant.price_cents)
        )}
      </td>

      <td className="p-4 text-right align-middle tabular-nums">
        {isEditing ? (
          <input
            className="w-20 rounded-md border px-2 py-1 text-right"
            type="number"
            min="0"
            step="1"
            value={inventory}
            onChange={(e) => setInventory(e.target.value)}
            disabled={saving}
          />
        ) : (
          <span className={cn(outOfStock && "text-destructive", lowStock && "text-amber-600")}>
            {variant.inventory_count}
            {outOfStock && (
              <Package className="ml-1 inline h-3.5 w-3.5 text-destructive/60" />
            )}
          </span>
        )}
      </td>

      <td className="p-4 text-right align-middle">
        {isEditing ? (
          <div className="inline-flex items-center gap-2">
            <button
              className="inline-flex items-center rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-60"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>

            <button
              className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
              onClick={() => {
                setError(null);
                setPrice((variant.price_cents / 100).toFixed(2));
                setInventory(String(variant.inventory_count));
                setIsEditing(false);
              }}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => {
              setError(null);
              setIsEditing(true);
            }}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        )}

        {error && <div className="mt-2 text-right text-xs text-red-600">{error}</div>}
      </td>
    </tr>
  );
}