// dev.ts
import { serve } from '@hono/node-server'
import app from './src/index.tsx' // path to your main Hono app


serve({
  fetch: app.fetch,
  port: 3000
})
console.log('Server is running on http://localhost:3000')
