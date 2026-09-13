import { Hono } from 'hono'
import { json } from 'react-router-dom';
import { HTTPException } from 'hono/http-exception'
import { html } from 'hono/html'

const app = new Hono()

app.get('/', (c) => {
  return c.html(
    <html>
      <head>
        <title>Atta Chakki</title>
      </head>
      <body>
        <h1>Atta Chakki</h1>
        <p>This Atta Chakki website will be live soon.</p>
      </body>
    </html>
  )
})

app.onError((error, c)=>{
  console.error(error.message)

  if(error instanceof HTTPException){
  return c.json({success: false, error: error.message}, error.status)
}
return c.json({success: false, error: "internal server error"}, 500)
  
})





const notFoundHtml = (path: string) => html`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Page Not Found</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: #FFFBF2;
    color: #4A2E1C;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
  }
  .grain { position: absolute; opacity: 0.06; font-size: 120px; }
  .grain.g1 { top: 8%; left: 6%; transform: rotate(-15deg); }
  .grain.g2 { bottom: 10%; right: 8%; transform: rotate(20deg); }
  .grain.g3 { top: 60%; left: 3%; transform: rotate(40deg); font-size: 80px; }
  .container { text-align: center; max-width: 560px; padding: 40px 24px; position: relative; z-index: 2; }
  .chakki { width: 140px; height: 140px; margin: 0 auto 28px; position: relative; }
  .chakki-outer {
    width: 140px; height: 140px; border-radius: 50%;
    background: linear-gradient(145deg, #E8863A, #D8722A);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 10px 30px rgba(216, 114, 42, 0.25);
    animation: spin 12s linear infinite;
  }
  .chakki-inner {
    width: 96px; height: 96px; border-radius: 50%; background: #FFF6E5;
    display: flex; align-items: center; justify-content: center;
    border: 3px dashed #F0A85C;
  }
  .chakki-core { width: 40px; height: 40px; border-radius: 50%; background: #C25A1E; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .code { font-size: 92px; font-weight: 800; color: #D8722A; line-height: 1; letter-spacing: -2px; margin-bottom: 8px; }
  h1 { font-size: 26px; font-weight: 700; color: #4A2E1C; margin-bottom: 12px; }
  p { font-size: 15.5px; color: #7A5B41; line-height: 1.6; margin-bottom: 8px; }
  .path-tag {
    display: inline-block; margin: 14px 0 28px; padding: 6px 16px;
    background: #FBEAD5; border: 1px solid #F0C896; border-radius: 20px;
    font-size: 13px; color: #A85D1E; font-family: 'Courier New', monospace;
  }
  .actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
  .btn {
    padding: 13px 28px; border-radius: 10px; font-size: 15px; font-weight: 600;
    text-decoration: none; transition: transform 0.15s ease, box-shadow 0.15s ease;
    cursor: pointer; border: none; display: inline-block;
  }
  .btn-primary { background: #D8722A; color: #FFFBF2; box-shadow: 0 6px 16px rgba(216, 114, 42, 0.3); }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 22px rgba(216, 114, 42, 0.38); }
  .btn-secondary { background: transparent; color: #A85D1E; border: 1.5px solid #E8A868; }
  .btn-secondary:hover { background: #FBEAD5; transform: translateY(-2px); }
  .footer-note { margin-top: 34px; font-size: 13px; color: #B99872; }
  @media (max-width: 480px) {
    .code { font-size: 68px; }
    h1 { font-size: 21px; }
    .actions { flex-direction: column; }
  }
</style>
</head>
<body>
  <div class="grain g1">🌾</div>
  <div class="grain g2">🌾</div>
  <div class="grain g3">🌾</div>

  <div class="container">
    <div class="chakki">
      <div class="chakki-outer">
        <div class="chakki-inner">
          <div class="chakki-core"></div>
        </div>
      </div>
    </div>

    <div class="code">404</div>
    <h1>This page got ground into flour</h1>
    <p>We couldn't find what you were looking for. It may have been moved, renamed, or never existed.</p>

    <div class="path-tag">${path}</div>

    <div class="actions">
      <a href="/" class="btn btn-primary">Back to home</a>
      <a href="/products" class="btn btn-secondary">Browse our atta</a>
    </div>

    <p class="footer-note">Fresh chakki-ground flour, delivered to your door.</p>
  </div>
</body>
</html>`






app.notFound((c)=>{
  return c.html(notFoundHtml(c.req.path), 404)
})


export default app