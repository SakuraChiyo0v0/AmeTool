import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function mcpProxyPlugin() {
  return {
    name: 'mcp-proxy',
    configureServer(server: any) {
      server.middlewares.use('/api/mcp-proxy', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let rawBody = ''
        req.on('data', (chunk: { toString: (encoding: string) => string }) => {
          rawBody += chunk.toString('utf8')
        })
        req.on('end', async () => {
          try {
            const body = JSON.parse(rawBody || '{}')
            const targetUrl = String(body.url || '')
            if (!/^https?:\/\//i.test(targetUrl)) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Invalid MCP url' }))
              return
            }

            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 15000)
            const response = await fetch(targetUrl, {
              method: 'POST',
              headers: {
                Accept: 'application/json, text/event-stream',
                'Content-Type': 'application/json',
                ...(body.headers || {}),
              },
              body: JSON.stringify(body.payload || {}),
              signal: controller.signal,
            })
            clearTimeout(timeout)

            const text = await response.text()
            res.statusCode = response.status
            res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json')
            res.end(text)
          } catch (error) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
          }
        })
      })
    },
  }
}

export default defineConfig({ plugins: [react(), mcpProxyPlugin()] })
