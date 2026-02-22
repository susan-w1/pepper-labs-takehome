import { Router } from "express";
import db from "../db.js";

const router = Router();

/**
 * GET /api/variants/:id
 * Get a single variant.
 */
router.get("/:id", (req, res) => {
  try {
    const variant = db
      .prepare("SELECT * FROM variants WHERE id = ?")
      .get(Number(req.params.id));

    if (!variant) {
      return res.status(404).json({ error: "Variant not found" });
    }

    res.json(variant);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/variants/:id
 * Update a variant's price and/or inventory.
 *
 * Expected body (all fields optional):
 * {
 *   "name": "Updated Name",
 *   "sku": "NEW-SKU",
 *   "price_cents": 1999,
 *   "inventory_count": 50
 * }
 */
router.put("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid variant id" });
    }

    // Confirm variant exists
    const existing = db
      .prepare("SELECT * FROM variants WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;

    if (!existing) {
      return res.status(404).json({ error: "Variant not found" });
    }

    const { price_cents, inventory_count } = req.body ?? {};

    // Validate: negative price/inventory not allowed (tests require 400 + JSON)
    if (price_cents !== undefined) {
      const p = Number(price_cents);
      if (!Number.isFinite(p) || p < 0) {
        return res.status(400).json({ error: "price_cents must be >= 0" });
      }
    }

    if (inventory_count !== undefined) {
      const inv = Number(inventory_count);
      if (!Number.isFinite(inv) || inv < 0) {
        return res.status(400).json({ error: "inventory_count must be >= 0" });
      }
    }

    // Update only the allowed fields (price + inventory)
    db.prepare(
      `
      UPDATE variants
      SET price_cents = COALESCE(?, price_cents),
          inventory_count = COALESCE(?, inventory_count),
          updated_at = datetime('now')
      WHERE id = ?
      `
    ).run(price_cents ?? null, inventory_count ?? null, id);

    const updated = db
      .prepare("SELECT * FROM variants WHERE id = ?")
      .get(id);

    return res.status(200).json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/variants/:id
 * Delete a variant permanently.
 */
router.delete("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    const variant = db
      .prepare("SELECT * FROM variants WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;

    if (!variant) {
      return res.status(404).json({ error: "Variant not found" });
    }

    // Prevent deleting the last variant of a product
    const siblingCount = db
      .prepare(
        "SELECT COUNT(*) AS count FROM variants WHERE product_id = ?"
      )
      .get(variant.product_id as number) as { count: number };

    if (siblingCount.count <= 1) {
      return res
        .status(400)
        .json({ error: "Cannot delete the last variant of a product" });
    }

    db.prepare("DELETE FROM variants WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
