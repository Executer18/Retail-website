/** @jsxImportSource hono/jsx */
import { Hono } from "hono";
import { requireAdmin } from "../../middleware/admin";
import { getDB } from "../../db";
import { products, productImages } from "../../db/schema";
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
  description: z.string().optional(),
  ingredients: z.string().optional(),
});

// ── Helper: upload one or many files to R2, return URLs in order ──
async function uploadImagesToR2(
  files: File | File[] | undefined,
  env: Env
): Promise<string[]> {
  if (!files) return [];
  const list = Array.isArray(files) ? files : [files];
  const urls: string[] = [];

  for (const file of list) {
    if (!file || file.size === 0) continue;
    const key = `products/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${file.name.replace(/\s+/g, "-")}`;
    try {
      await env.IMAGES.put(key, file.stream(), {
        httpMetadata: { contentType: file.type },
      });
      urls.push(`/images/${key}`);
    } catch (e) {
      // One failed upload shouldn't kill the rest — log and continue.
      // If this ever fires, check wrangler tail for the R2 error and
      // manually verify no orphan DB row was created for this file.
      console.error("R2 upload failed for", file.name, e);
    }
  }
  return urls;
}

// ── Helper: delete an R2 object, swallow errors (already-gone is fine) ──
async function deleteFromR2(imageUrl: string, env: Env) {
  const key = imageUrl.replace("/images/", "");
  try {
    await env.IMAGES.delete(key);
  } catch (e) {
    console.error("R2 delete failed for", key, e);
  }
}

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
          input, select, textarea { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; font-family: inherit; }
          textarea { resize: vertical; min-height: 80px; }
          input:focus, select:focus, textarea:focus { outline: none; border-color: #D8722A; }
          .error { color: #e74c3c; font-size: 12px; margin-top: 4px; }
          .hint { color: #999; font-size: 12px; margin-top: 4px; }
          .alert { padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; font-size: 14px; }
          .alert-success { background: #d4edda; color: #155724; }
          .alert-error { background: #f8d7da; color: #721c24; }
          .stock-controls { display: flex; align-items: center; gap: 6px; }
          .stock-btn { width: 28px; height: 28px; border-radius: 4px; border: 1px solid #ddd; background: white; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }
          .actions { display: flex; gap: 8px; }
          .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .image-manager { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
          .image-manager__item { position: relative; width: 84px; }
          .image-manager__item img { width: 84px; height: 84px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; }
          .image-manager__cover-tag { position: absolute; top: 4px; left: 4px; background: #D8722A; color: white; font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: 700; }
          .image-manager__controls { display: flex; justify-content: space-between; margin-top: 4px; gap: 4px; }
          .image-manager__controls button { flex: 1; font-size: 11px; padding: 3px 0; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; }
          .image-manager__controls button.danger { color: #e74c3c; border-color: #f3c2bd; }
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

// ── Shared category options ─────────────────────────────
const CATEGORIES = ["Atta", "Flour", "Grain", "Rice", "massala", "other"];

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
              {CATEGORIES.map((cat) => <option value={cat}>{cat}</option>)}
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
            <label>Description</label>
            <textarea name="description" placeholder="One short point per line, e.g.&#10;Stone ground&#10;No added preservatives&#10;Packed fresh weekly"></textarea>
            <p class="hint">Each line becomes one bullet point on the product page. Keep lines short.</p>
          </div>
          <div class="field">
            <label>Ingredients</label>
            <input name="ingredients" placeholder="e.g. Wheat, Bran" />
            <p class="hint">Comma-separated. Each item becomes a small tag on the product page.</p>
          </div>
          <div class="field">
            <label>Product Images</label>
            <input name="images" type="file" accept="image/*" multiple />
            <p class="hint">Select multiple photos if you have them. The first one becomes the cover image.</p>
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
  const body = await c.req.parseBody({ all: true });

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
                {CATEGORIES.map((cat) => <option value={cat}>{cat}</option>)}
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
              <label>Description</label>
              <textarea name="description">{String(body["description"] || "")}</textarea>
            </div>
            <div class="field">
              <label>Ingredients</label>
              <input name="ingredients" value={String(body["ingredients"] || "")} />
            </div>
            <div class="field">
              <label>Product Images</label>
              <input name="images" type="file" accept="image/*" multiple />
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

  // Upload all selected images, in the order the browser gave them
  const imageUrls = await uploadImagesToR2(body["images"] as File | File[] | undefined, c.env);

  await db.insert(products).values({
    itemName: parsed.data.itemName,
    category: parsed.data.category,
    pricePerKg: parsed.data.pricePerKg,
    inStockKg: parsed.data.inStockKg,
    description: parsed.data.description || null,
    ingredients: parsed.data.ingredients || null,
    imageUrl: imageUrls[0] || null, // legacy column mirrors the cover image
  });

  // Get the row we just inserted so we have its id for the gallery rows
  const inserted = await db
    .select()
    .from(products)
    .orderBy(sql`${products.productId} DESC`)
    .limit(1);
  const newProductId = inserted[0]?.productId;

  if (newProductId && imageUrls.length > 0) {
    for (let i = 0; i < imageUrls.length; i++) {
      await db.insert(productImages).values({
        productId: newProductId,
        imageUrl: imageUrls[i],
        sortOrder: i,
      });
    }
  }

  return c.redirect("/admin/products?success=Product added successfully");
});

// ── GET /admin/products/:id/edit ───────────────────────
productsRouter.get("/:id/edit", requireAdmin, async (c) => {
  const db = getDB(c.env);
  const id = Number(c.req.param("id"));
  const result = await db.select().from(products).where(eq(products.productId, id));
  const product = result[0];
  if (!product) return c.notFound();

  const gallery = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, id))
    .orderBy(asc(productImages.sortOrder));

  const warn = gallery.length === 0;

  return c.html(
    <AdminLayout title="Edit Product">
      <a href="/admin/products" style="font-size:13px;color:#666;text-decoration:none">← Back to products</a>
      <h1 style="margin-top:12px;margin-bottom:20px">Edit Product</h1>

      {warn && (
        <div class="alert alert-error" style="max-width:560px">
          ⚠ This product has no images yet. The storefront will show a "No image" placeholder until you add at least one.
        </div>
      )}

      <div class="form-card">
        {gallery.length > 0 && (
          <div class="field">
            <label>Current Images (first = cover image)</label>
            <div class="image-manager">
              {gallery.map((img, i) => (
                <div class="image-manager__item" key={img.imageId}>
                  <img src={img.imageUrl} alt="" />
                  {i === 0 && <span class="image-manager__cover-tag">COVER</span>}
                  <div class="image-manager__controls">
                    <form method="POST" action={`/admin/products/${id}/images/${img.imageId}/move-up`} style="margin:0;flex:1">
                      <button type="submit" disabled={i === 0}>↑</button>
                    </form>
                    <form method="POST" action={`/admin/products/${id}/images/${img.imageId}/move-down`} style="margin:0;flex:1">
                      <button type="submit" disabled={i === gallery.length - 1}>↓</button>
                    </form>
                  </div>
                  <form method="POST" action={`/admin/products/${id}/images/${img.imageId}/delete`}
                    style="margin-top:4px" onsubmit="return confirm('Delete this image?')">
                    <button type="submit" class="danger" style="width:100%;font-size:11px;padding:3px 0;border:1px solid #f3c2bd;background:white;border-radius:4px;cursor:pointer;color:#e74c3c">Delete</button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}

        <form method="POST" action={`/admin/products/${id}/edit`} enctype="multipart/form-data">
          <div class="field">
            <label>Product Name</label>
            <input name="itemName" value={product.itemName} required />
          </div>
          <div class="field">
            <label>Category</label>
            <select name="category" required>
              {CATEGORIES.map((cat) => (
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
            <label>Description</label>
            <textarea name="description" placeholder="One short point per line">{product.description || ""}</textarea>
            <p class="hint">Each line becomes one bullet point on the product page. Keep lines short.</p>
          </div>
          <div class="field">
            <label>Ingredients</label>
            <input name="ingredients" value={product.ingredients || ""} placeholder="e.g. Wheat, Bran" />
            <p class="hint">Comma-separated. Each item becomes a small tag on the product page.</p>
          </div>
          <div class="field">
            <label>Add More Images</label>
            <input name="images" type="file" accept="image/*" multiple />
            <p class="hint">New photos are added after the existing ones — they don't replace them.</p>
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
  const body = await c.req.parseBody({ all: true });

  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return c.redirect(`/admin/products/${id}/edit?error=1`);

  const existing = await db.select().from(products).where(eq(products.productId, id));
  if (!existing[0]) return c.notFound();

  // Upload any newly added images, appended after existing ones
  const currentGallery = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, id))
    .orderBy(asc(productImages.sortOrder));

  const newUrls = await uploadImagesToR2(body["images"] as File | File[] | undefined, c.env);

  let nextSortOrder = currentGallery.length;
  for (const url of newUrls) {
    await db.insert(productImages).values({
      productId: id,
      imageUrl: url,
      sortOrder: nextSortOrder,
    });
    nextSortOrder++;
  }

  // Recompute the cover image: first image in sortOrder after this change
  const refreshedGallery = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, id))
    .orderBy(asc(productImages.sortOrder));
  const coverUrl = refreshedGallery[0]?.imageUrl || null;

  await db.update(products)
    .set({
      itemName: parsed.data.itemName,
      category: parsed.data.category,
      pricePerKg: parsed.data.pricePerKg,
      inStockKg: parsed.data.inStockKg,
      description: parsed.data.description || null,
      ingredients: parsed.data.ingredients || null,
      imageUrl: coverUrl,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(products.productId, id));

  return c.redirect("/admin/products?success=Product updated successfully");
});

// ── POST /admin/products/:id/images/:imageId/delete ────
productsRouter.post("/:id/images/:imageId/delete", requireAdmin, async (c) => {
  const db = getDB(c.env);
  const productId = Number(c.req.param("id"));
  const imageId = Number(c.req.param("imageId"));

  const row = await db.select().from(productImages).where(eq(productImages.imageId, imageId));
  if (row[0]) {
    await deleteFromR2(row[0].imageUrl, c.env);
    await db.delete(productImages).where(eq(productImages.imageId, imageId));
  }

  // Re-sync the cover image in case we just deleted it
  const remaining = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.sortOrder));

  await db.update(products)
    .set({ imageUrl: remaining[0]?.imageUrl || null })
    .where(eq(products.productId, productId));

  return c.redirect(`/admin/products/${productId}/edit`);
});

// ── POST /admin/products/:id/images/:imageId/move-up ───
productsRouter.post("/:id/images/:imageId/move-up", requireAdmin, async (c) => {
  const db = getDB(c.env);
  const productId = Number(c.req.param("id"));
  const imageId = Number(c.req.param("imageId"));

  const gallery = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.sortOrder));

  const index = gallery.findIndex((img) => img.imageId === imageId);
  if (index > 0) {
    const current = gallery[index];
    const prev = gallery[index - 1];
    await db.update(productImages).set({ sortOrder: prev.sortOrder }).where(eq(productImages.imageId, current.imageId));
    await db.update(productImages).set({ sortOrder: current.sortOrder }).where(eq(productImages.imageId, prev.imageId));

    // If the cover image changed, sync products.imageUrl
    if (index - 1 === 0) {
      await db.update(products).set({ imageUrl: current.imageUrl }).where(eq(products.productId, productId));
    }
  }

  return c.redirect(`/admin/products/${productId}/edit`);
});

// ── POST /admin/products/:id/images/:imageId/move-down ─
productsRouter.post("/:id/images/:imageId/move-down", requireAdmin, async (c) => {
  const db = getDB(c.env);
  const productId = Number(c.req.param("id"));
  const imageId = Number(c.req.param("imageId"));

  const gallery = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.sortOrder));

  const index = gallery.findIndex((img) => img.imageId === imageId);
  if (index !== -1 && index < gallery.length - 1) {
    const current = gallery[index];
    const next = gallery[index + 1];
    await db.update(productImages).set({ sortOrder: next.sortOrder }).where(eq(productImages.imageId, current.imageId));
    await db.update(productImages).set({ sortOrder: current.sortOrder }).where(eq(productImages.imageId, next.imageId));

    // If current was the cover and got pushed down, sync products.imageUrl to the new first
    if (index === 0) {
      await db.update(products).set({ imageUrl: next.imageUrl }).where(eq(products.productId, productId));
    }
  }

  return c.redirect(`/admin/products/${productId}/edit`);
});

// ── POST /admin/products/:id/delete ───────────────────
productsRouter.post("/:id/delete", requireAdmin, async (c) => {
  const db = getDB(c.env);
  const id = Number(c.req.param("id"));

  // Clean up gallery images from R2 before dropping the DB rows
  const gallery = await db.select().from(productImages).where(eq(productImages.productId, id));
  for (const img of gallery) {
    await deleteFromR2(img.imageUrl, c.env);
  }

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
