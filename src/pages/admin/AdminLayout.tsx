/** @jsxImportSource hono/jsx */
// src/pages/admin/AdminLayout.tsx
//
// Shared shell for every admin page (dashboard, products, orders). It used to be
// a private function inside products.tsx. `wide` gives the orders table more room.

export function AdminLayout({ children, title, wide }: { children: any; title: string; wide?: boolean }) {
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
          main.wide { max-width: 1200px; }
          .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-bottom: 24px; }
          .stat { background: white; border-radius: 8px; padding: 18px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
          .stat small { display: block; color: #777; font-size: 12px; margin-bottom: 6px; }
          .stat b { font-size: 26px; color: #1a1a2e; }
          .stat a { color: inherit; text-decoration: none; display: block; }
          .panel { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); margin-bottom: 20px; }
          .panel h2 { font-size: 16px; margin-bottom: 12px; }
          .banner { padding: 14px 16px; border-radius: 8px; margin-bottom: 14px; font-size: 14px; line-height: 1.5; }
          .banner-danger { background: #f8d7da; color: #721c24; }
          .banner-warn { background: #fff3cd; color: #856404; }
          .banner ul { margin: 8px 0 0 18px; }
          .banner a { color: inherit; font-weight: 700; }
          .tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
          .tab { padding: 7px 14px; border-radius: 999px; background: white; color: #555; font-size: 13px; font-weight: 600; text-decoration: none; border: 1px solid #e3e3e3; }
          .tab.on { background: #D8722A; border-color: #D8722A; color: white; }
          .tab small { opacity: .75; margin-left: 4px; }
          .toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
          .toolbar input, .toolbar select { width: auto; min-width: 180px; }
          .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #eee; color: #555; white-space: nowrap; }
          .badge-Reserved { background: #fff3cd; color: #856404; }
          .badge-Confirmed { background: #d1ecf1; color: #0c5460; }
          .badge-Preparing { background: #e2d9f3; color: #432874; }
          .badge-Ready { background: #d4edda; color: #155724; }
          .badge-Collected { background: #e9ecef; color: #495057; }
          .badge-Cancelled { background: #f8d7da; color: #721c24; }
          .badge-paid { background: #d4edda; color: #155724; }
          .badge-unpaid { background: #fff3cd; color: #856404; }
          .badge-refunded { background: #e2d9f3; color: #432874; }
          .badge-pending { background: #fff3cd; color: #856404; }
          .row-actions { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
          .row-actions form { margin: 0; }
          .btn-success { background: #1f9d55; color: white; }
          .btn-outline { background: white; color: #333; border: 1px solid #ddd; }
          .muted { color: #888; font-size: 12px; }
          .pager { display: flex; gap: 8px; align-items: center; justify-content: center; margin-top: 16px; font-size: 13px; }
          .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          @media (max-width: 800px) { .detail-grid { grid-template-columns: 1fr; } }
          .kv { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; font-size: 14px; border-bottom: 1px solid #f2f2f2; }
          .kv:last-child { border-bottom: none; }
          .kv span:first-child { color: #777; }
          .kv b { text-align: right; }
          .items-table img.thumb { width: 40px; height: 40px; }
          .table-wrap { overflow-x: auto; }
        `}</style>
      </head>
      <body>
        <nav>
          <span class="brand">🌾 Atta Chakki Admin</span>
          <a href="/admin">Dashboard</a>
          <a href="/admin/orders">Orders</a>
          <a href="/admin/products">Products</a>
          <form method="POST" action="/logout" style="margin:0">
            <button type="submit" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:14px">Logout</button>
          </form>
        </nav>
        <main class={wide ? "wide" : ""}>{children}</main>
      </body>
    </html>
  );
}
