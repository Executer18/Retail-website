// src/routes/contact.tsx
//
// GET /contact — static contact page (no login, no database).

import { Hono } from 'hono'
import type { Env, Variables } from '../db'
import { ContactPage } from '../pages/ContactPage'

export const contactRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

contactRoutes.get('/contact', (c) => c.html(<ContactPage />))