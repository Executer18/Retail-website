/** @jsxImportSource hono/jsx */
import { Hono } from "hono";
import { requireAdmin } from "../../middleware/admin";
import { getDB } from "../../db";
import { products } from "../../db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { z } from "zod";
import type { Env } from "../../db";

export const productsRouter = new Hono<{ Bindings: Env }>();

// ── Validation Schema ──────────────────────────────────
const productSchema = z.object({
  itemName: z.string().min(1, "Product name is required"),
  category: z.string().min(1, "Category is required"),
  pricePerKg: z.coerce.number().positive("Price must be positive"),
  inStockKg: z.coerce.number().min(0, "Stock cannot be negative"),
});

// ── Layout ─────────────────────────────────────────────
function AdminLayout({ children, title }: { children: any; title: string }) {
  return (
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title} — Admin</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: system-ui, sans-serif; background: #f5f5f5; color: #333; }
          nav { background: #1a1a2e; color: white; padding: 14px 24px; display: flex; gap: 24px; align-items: center; }
          nav a { color: #ccc; text-decoration: none; font-size: 14px; }
          nav a:hover { color: white; }
          nav .brand { color: white; font-weight: 700; font-size: 16px; margin-right: auto; }
          main { max-width: 1000px; margin: 32px auto; padding: 0 16px; }
          h1 { font-size: 22px; margin-bottom: 20px; }
          .btn { display: inline-block; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none; cursor: pointer; border: none; }
          .btn-primary { background: #D8722A; color: white; }
          .btn-danger { background: #e74c3c; color: white; }
          .btn-secondary { background: #eee; color: #333; }
          .btn-sm { padding: 5px 10px; font-size: 12px; }
          table { width: 100%; background: white; border-radius: 8px; border-collapse: collapse; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
          th { background: #f9f9f9; padding: 12px 16px; text-align: left; font-size: 13px; color: #666; border-bottom: 1px solid #eee; }
          td { padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
          tr:last-child td { border-bottom: none; }
          img.thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 4px; background: #eee; }
          .empty { background: white; border-radius: 8px; padding: 48px; text-align: center; color: #999; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
          .form-card { background: white; border-radius: 8px; padding: 28px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); max-width: 560px; }
          .field { margin-bottom: 16px; }
          label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #555; }
          input, select { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
          input:focus, select:focus { outline: none; border-color: #D8722A; }
          .error { color: #e74c3c; font-size: 12px; margin-top: 4px; }
          .alert { padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; font-size: 14px; }
          .alert-success { background: #d4edda; color: #155724; }
          .alert-error { background: #f8d7da; color: #721c24; }
          .stock-controls { display: flex; align-items: center; gap: 6px; }
          .stock-btn { width: 28px; height: 28px; border-radius: 4px; border: 1px solid #ddd; background: white; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }
          .actions { display: flex; gap: 8px; }
          .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        `}</style>
      </head>
      <body>
        <nav>
          <span class="brand">🌾 Atta Chakki Admin</span>
          <a href="/admin">Dashboard</a>
          <a href="/admin/products">Products</a>
          <form method="POST" action="/logout" style="margin:0">
            <button type="submit" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:14px">Logout</button>
          </form>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}

// ── GET /admin/products ────────────────────────────────
productsRouter.get("/", requireAdmin, async (c) => {
  const db = getDB(c.env);
  const allProducts = await db
    .select()
    .from(products)
    .orderBy(asc(products.itemName));

  const success = c.req.query("success");

  return c.html(
    <AdminLayout title="Products">
      {success && <div class="alert alert-success">✓ {success}</div>}
      <div class="header-row">
        <h1>Products</h1>
        <a href="/admin/products/new" class="btn btn-primary">+ Add Product</a>
      </div>

      {allProducts.length === 0 ? (
        <div class="empty">
          <p style="font-size:48px;margin-bottom:16px">📦</p>
          <p style="font-size:16px;font-weight:600;margin-bottom:8px">No products yet</p>
          <p>Add your first product to get started.</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price/kg</th>
              <th>Stock (kg)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allProducts.map((p) => (
              <tr key={p.productId}>
                <td>
                  {p.imageUrl ? (
                    <img class="thumb" src={p.imageUrl} alt={p.itemName} />
                  ) : (
                    <div class="thumb" style="display:flex;align-items:center;justify-content:center;color:#ccc">?</div>
                  )}
                </td>
                <td style="font-weight:600">{p.itemName}</td>
                <td>{p.category}</td>
                <td>₹{p.pricePerKg}</td>
                <td>
                  <div class="stock-controls">
                    <form method="POST" action={`/admin/products/${p.productId}/stock/decrease`} style="margin:0">
                      <button type="submit" class="stock-btn">−</button>
                    </form>
                    <span style="min-width:40px;text-align:center">{p.inStockKg} kg</span>
                    <form method="POST" action={`/admin/products/${p.productId}/stock/increase`} style="margin:0">
                      <button type="submit" class="stock-btn">+</button>
                    </form>
                  </div>
                </td>
                <td>
                  <div class="actions">
                    <a href={`/admin/products/${p.productId}/edit`} class="btn btn-secondary btn-sm">Edit</a>
                    <form method="POST" action={`/admin/products/${p.productId}/delete`} style="margin:0"
                      onsubmit="return confirm('Delete this product?')">
                      <button type="submit" class="btn btn-danger btn-sm">Delete</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
});

// ── GET /admin/products/new ────────────────────────────
productsRouter.get("/new", requireAdmin, (c) => {
  return c.html(
    <AdminLayout title="Add Product">
      <a href="/admin/products" style="font-size:13px;color:#666;text-decoration:none">← Back to products</a>
      <h1 style="margin-top:12px;margin-bottom:20px">Add Product</h1>
      <div class="form-card">
        <form method="POST" action="/admin/products" enctype="multipart/form-data">
          <div class="field">
            <label>Product Name</label>
            <input name="itemName" placeholder="e.g. Whole Wheat Atta" required />
          </div>
          <div class="field">
            <label>Category</label>
            <select name="category" required>
              <option value="">Select category</option>
              <option value="Atta">Atta</option>
              <option value="Flour">Flour</option>
              <option value="Grain">Grain</option>
              <option value="Rice">Rice</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="field">
            <label>Price per kg (₹)</label>
            <input name="pricePerKg" type="number" step="0.01" min="0" placeholder="e.g. 45.00" required />
          </div>
          <div class="field">
            <label>Stock (kg)</label>
            <input name="inStockKg" type="number" step="0.1" min="0" placeholder="e.g. 100" required />
          </div>
          <div class="field">
            <label>Product Image</label>
            <input name="image" type="file" accept="image/*" />
            <p style="font-size:12px;color:#999;margin-top:4px">Optional. JPG or PNG recommended.</p>
          </div>
          <div style="display:flex;gap:12px;margin-top:8px">
            <button type="submit" class="btn btn-primary">Add Product</button>
            <a href="/admin/products" class="btn btn-secondary">Cancel</a>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
});

// ── POST /admin/products ───────────────────────────────
productsRouter.post("/", requireAdmin, async (c) => {
  const db = getDB(c.env);
  const body = await c.req.parseBody();

  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return c.html(
      <AdminLayout title="Add Product">
        <a href="/admin/products" style="font-size:13px;color:#666;text-decoration:none">← Back</a>
        <h1 style="margin-top:12px;margin-bottom:20px">Add Product</h1>
        <div class="form-card">
          <div class="alert alert-error">Please fix the errors below.</div>
          <form method="POST" action="/admin/products" enctype="multipart/form-data">
            <div class="field">
              <label>Product Name</label>
              <input name="itemName" value={String(body["itemName"] || "")} required />
              {errors.itemName && <p class="error">{errors.itemName[0]}</p>}
            </div>
            <div class="field">
              <label>Category</label>
              <select name="category" required>
                <option value="">Select category</option>
                <option value="Atta">Atta</option>
                <option value="Flour">Flour</option>
                <option value="Grain">Grain</option>
                <option value="Rice">Rice</option>
                <option value="Other">Other</option>
              </select>
              {errors.category && <p class="error">{errors.category[0]}</p>}
            </div>
            <div class="field">
              <label>Price per kg (₹)</label>
              <input name="pricePerKg" type="number" step="0.01" value={String(body["pricePerKg"] || "")} required />
              {errors.pricePerKg && <p class="error">{errors.pricePerKg[0]}</p>}
            </div>
            <div class="field">
              <label>Stock (kg)</label>
              <input name="inStockKg" type="number" step="0.1" value={String(body["inStockKg"] || "")} required />
              {errors.inStockKg && <p class="error">{errors.inStockKg[0]}</p>}
            </div>
            <div class="field">
              <label>Product Image</label>
              <input name="image" type="file" accept="image/*" />
            </div>
            <div style="display:flex;gap:12px;margin-top:8px">
              <button type="submit" class="btn btn-primary">Add Product</button>
              <a href="/admin/products" class="btn btn-secondary">Cancel</a>
            </div>
          </form>
        </div>
      </AdminLayout>
    , 400);
  }

  let imageUrl: string | null = null;
  const file = body["image"] as File;
  if (file && file.size > 0) {
    const key = `products/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    await c.env.IMAGES.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });
    imageUrl = `/images/${key}`;
  }

  await db.insert(products).values({
    itemName: parsed.data.itemName,
    category: parsed.data.category,
    pricePerKg: parsed.data.pricePerKg,
    inStockKg: parsed.data.inStockKg,
    imageUrl,
  });

  return c.redirect("/admin/products?success=Product added successfully");
});

// ── GET /admin/products/:id/edit ───────────────────────
productsRouter.get("/:id/edit", requireAdmin, async (c) => {
  const db = getDB(c.env);
  const id = Number(c.req.param("id"));
  const result = await db.select().from(products).where(eq(products.productId, id));
  const product = result[0];
  if (!product) return c.notFound();

  return c.html(
    <AdminLayout title="Edit Product">
      <a href="/admin/products" style="font-size:13px;color:#666;text-decoration:none">← Back to products</a>
      <h1 style="margin-top:12px;margin-bottom:20px">Edit Product</h1>
      <div class="form-card">
        <form method="POST" action={`/admin/products/${id}/edit`} enctype="multipart/form-data">
          <div class="field">
            <label>Product Name</label>
            <input name="itemName" value={product.itemName} required />
          </div>
          <div class="field">
            <label>Category</label>
            <select name="category" required>
              {["Atta", "Flour", "Grain", "Rice", "Other"].map((cat) => (
                <option value={cat} selected={product.category === cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div class="field">
            <label>Price per kg (₹)</label>
            <input name="pricePerKg" type="number" step="0.01" value={String(product.pricePerKg)} required />
          </div>
          <div class="field">
            <label>Stock (kg)</label>
            <input name="inStockKg" type="number" step="0.1" value={String(product.inStockKg)} required />
          </div>
          <div class="field">
            <label>Replace Image (optional)</label>
            {product.imageUrl && (
              <div style="margin-bottom:8px">
                <img src={product.imageUrl} style="width:80px;height:80px;object-fit:cover;border-radius:4px" />
              </div>
            )}
            <input name="image" type="file" accept="image/*" />
          </div>
          <div style="display:flex;gap:12px;margin-top:8px">
            <button type="submit" class="btn btn-primary">Save Changes</button>
            <a href="/admin/products" class="btn btn-secondary">Cancel</a>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
});

// ── POST /admin/products/:id/edit ──────────────────────
productsRouter.post("/:id/edit", requireAdmin, async (c) => {
  const db = getDB(c.env);
  const id = Number(c.req.param("id"));
  const body = await c.req.parseBody();

  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return c.redirect(`/admin/products/${id}/edit?error=1`);

  const existing = await db.select().from(products).where(eq(products.productId, id));
  if (!existing[0]) return c.notFound();

  let imageUrl = existing[0].imageUrl;
  const file = body["image"] as File;
  if (file && file.size > 0) {
    const key = `products/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    await c.env.IMAGES.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });
    imageUrl = `/images/${key}`;
  }

  await db.update(products)
    .set({
      itemName: parsed.data.itemName,
      category: parsed.data.category,
      pricePerKg: parsed.data.pricePerKg,
      inStockKg: parsed.data.inStockKg,
      imageUrl,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(products.productId, id));

  return c.redirect("/admin/products?success=Product updated successfully");
});

// ── POST /admin/products/:id/delete ───────────────────
productsRouter.post("/:id/delete", requireAdmin, async (c) => {
  const db = getDB(c.env);
  const id = Number(c.req.param("id"));
  await db.delete(products).where(eq(products.productId, id));
  return c.redirect("/admin/products?success=Product deleted");
});

// ── POST /admin/products/:id/stock/increase ────────────
productsRouter.post("/:id/stock/increase", requireAdmin, async (c) => {
  const db = getDB(c.env);
  const id = Number(c.req.param("id"));
  await db.update(products)
    .set({ inStockKg: sql`${products.inStockKg} + 1` })
    .where(eq(products.productId, id));
  return c.redirect("/admin/products");
});

// ── POST /admin/products/:id/stock/decrease ────────────
productsRouter.post("/:id/stock/decrease", requireAdmin, async (c) => {
  const db = getDB(c.env);
  const id = Number(c.req.param("id"));
  await db.update(products)
    .set({ inStockKg: sql`${products.inStockKg} - 1` })
    .where(eq(products.productId, id));
  return c.redirect("/admin/products");
});