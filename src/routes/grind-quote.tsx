// src/routes/grind-quote.ts
//
// Route: GET  /grind-your-wheat        — the form page
// Route: POST /api/grind-quote         — htmx, returns just the result
//                                         fragment, no DB write at all
//
// Public — no login check anywhere in this file, per your decision that
// the calculators don't need an account.

import { Hono } from 'hono'
import { Layout } from '../components/Layout'
import { GRAIN_CONFIG, calculateGrindQuote } from '../lib/grain-pricing'
import { GrindQuoteResult } from '../pages/fragments/GrindQuoteResult'

export const grindQuoteRoutes = new Hono()

grindQuoteRoutes.get('/grind-your-wheat', (c) => {
  return c.html(
    <Layout title="Bring your wheat to grind" description="Get an estimate before you visit.">
      <h1 style="margin-bottom: var(--space-2);">Bring your wheat to grind</h1>
      <p class="text-muted" style="margin-bottom: var(--space-5);">
        This is an estimate only. The final amount is confirmed in person once we've checked your grain's quality.
      </p>

      <form hx-post="/api/grind-quote" hx-target="#grind-quote-result" hx-swap="innerHTML" class="quote-form">
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

      <div id="grind-quote-result" style="margin-top: var(--space-5);"></div>
    </Layout>
  )
})

grindQuoteRoutes.post('/api/grind-quote', async (c) => {
  const body = await c.req.parseBody()
  const grainKey = String(body.grainKey || '')
  const inputKg = parseFloat(String(body.inputKg || '0'))

  const quote = calculateGrindQuote(grainKey, inputKg)
  if (!quote) {
    return c.html(<p class="stock-note stock-note--out">Enter a valid grain type and quantity.</p>)
  }

  return c.html(<GrindQuoteResult quote={quote} />)
})
