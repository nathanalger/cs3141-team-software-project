import { Hono } from 'hono'

const app = new Hono()

// Quick check that the backend is running: http://localhost:5173/api/health
app.get('/api/health', (c) => c.json({ ok: true }))

Deno.serve({ port: 8000 }, app.fetch)