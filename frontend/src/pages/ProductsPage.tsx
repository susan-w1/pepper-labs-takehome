import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, X, AlertTriangle } from "lucide-react";
import { fetchProducts, fetchCategories } from "@/lib/api";
import type { Product, Category } from "@/types";
import ProductCard from "@/components/ProductCard";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();

  // Loading + error states (Task 4)
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const hasFilters = Boolean(search || categoryId);

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    setCategoriesError(null);
    try {
      const res = await fetchCategories();
      if (!res.ok) throw new Error(`Failed to load categories (${res.status})`);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setCategories([]);
      setCategoriesError(e?.message ?? "Couldn’t load categories.");
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    setProductsError(null);

    try {
      const res = await fetchProducts({
        search: search || undefined,
        category_id: categoryId,
      });
      if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setProducts([]);
      setProductsError(e?.message ?? "Couldn’t load products. Please try again.");
    } finally {
      setLoadingProducts(false);
    }
  }, [search, categoryId]);

  // Fetch categories on mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Fetch products when filters change
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const clearFilters = () => {
    setSearch("");
    setCategoryId(undefined);
  };

  return (
    <div>
      {/* Filters bar — matches CatalogFilters layout */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <label className="mb-1.5 block text-sm font-medium">Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>

        {/* Category filter */}
        <div className="sm:min-w-[180px]">
          <label className="mb-1.5 block text-sm font-medium">Category</label>
          <select
            value={categoryId ?? ""}
            onChange={(e) =>
              setCategoryId(e.target.value ? Number(e.target.value) : undefined)
            }
            className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            disabled={loadingCategories && categories.length === 0}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Category loading / error helper text */}
          {loadingCategories && (
            <p className="mt-1 text-xs text-muted-foreground">Loading categories…</p>
          )}

        </div>

        {/* Clear + New Product */}
        <div className="flex items-end gap-2">
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}

          <Link
            to="/products/new"
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#2E3330] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#3a3f3c]"
          >
            <Plus className="h-4 w-4" />
            New Product
          </Link>
        </div>
      </div>

      {/* Products error state */}
      {productsError && !loadingProducts && (
  <div className="mb-6 rounded-lg border bg-card p-8 shadow-card">
    <div className="flex flex-col items-center text-center">
      <AlertTriangle className="h-6 w-6 text-destructive" />
      <p className="mt-3 text-base font-semibold">Couldn’t load products</p>
      <p className="mt-1 text-sm text-muted-foreground">{productsError}</p>

      <button
        onClick={loadProducts}
        className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Retry
      </button>
    </div>
  </div>
)}

      {/* Result count */}
      <p className="mb-4 text-sm text-muted-foreground">
        {loadingProducts ? "Loading…" : `${products.length} result${products.length !== 1 ? "s" : ""} found`}
      </p>

      {/* Loading state */}
      {productsError ? null : products.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
    <p className="text-lg font-medium">No products found</p>
    <p className="mt-1 text-sm">Try adjusting your search or filters.</p>
  </div>
) : (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
    {products.map((p) => (
      <ProductCard key={p.id} product={p} />
    ))}
  </div>
)}
    </div>
  );
}