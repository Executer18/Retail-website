// src/routes/sell-quote.ts
//
// Route: GET  /sell-your-grain
// Route: POST /api/sell-quote
//
// Same pattern as grind-quote.ts: public, stateless, no DB write.

import { Hono } from 'hono'
import { Layout } from '../components/Layout'
import { GRAIN_CONFIG, calculateSellQuote } from '../lib/grain-pricing'
import { SellQuoteResult } from '../pages/fragments/SellQuoteResult'

export const sellQuoteRoutes = new Hono()

sellQuoteRoutes.get('/sell-your-grain', (c) => {
  return c.html(
    <Layout title="Sell your grain to us" description="Get an estimate before you visit.">
      <h1 style="margin-bottom: var(--space-2);">Sell your grain to us</h1>
      <p class="text-muted" style="margin-bottom: var(--space-5);">
        This is an estimate only. The final price is confirmed in person after we check your grain.
      </p>

      <form hx-post="/api/sell-quote" hx-target="#sell-quote-result" hx-swap="innerHTML" class="quote-form">
        <label class="form-field">
          <span>Grain type</span>
          <select name="grainKey" required>
            {Object.entries(GRAIN_CONFIG).map(([key, config]) => (
              <option value={key}>{config.label}</option>
            ))}
          </select>
        </label>

        <label class="form-field">
          <span>Approximate quantity (kg)</span>
          <input type="number" name="inputKg" min="1" step="0.5" required />
        </label>

        <button type="submit" class="btn btn-primary" style="width: 100%;">
          Get estimate
        </button>
      </form>

      <div id="sell-quote-result" style="margin-top: var(--space-5);"></div>
    </Layout>
  )
})

sellQuoteRoutes.post('/api/sell-quote', async (c) => {
  const body = await c.req.parseBody()
  const grainKey = String(body.grainKey || '')
  const inputKg = parseFloat(String(body.inputKg || '0'))

  const quote = calculateSellQuote(grainKey, inputKg)
  if (!quote) {
    return c.html(<p class="stock-note stock-note--out">Enter a valid grain type and quantity.</p>)
  }

  return c.html(<SellQuoteResult quote={quote} />)
})
