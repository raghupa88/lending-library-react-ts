import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import compression from 'compression'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function createServer(
    root = process.cwd(),
    isProd = process.env.NODE_ENV === 'production',
) {
    const resolve = (p) => path.resolve(__dirname, p)

    const app = express()
    app.use(compression())

    // Security headers applied to all responses
    app.use((_req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('X-Frame-Options', 'DENY')
        res.setHeader('X-XSS-Protection', '1; mode=block')
        res.setHeader(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
        )
        next()
    })

    let vite
    if (!isProd) {
        vite = await (await import('vite')).createServer({
            root,
            logLevel: 'info',
            server: {
                middlewareMode: true,
                watch: {
                    usePolling: true,
                    interval: 100,
                },
            },
            appType: 'custom',
        })
        app.use(vite.middlewares)
    } else {
        app.use((await import('sirv')).default('dist/client', {
            gzip: true,
            etag: true,
        }))
    }

    app.use(async (req, res) => {
        try {
            const url = req.originalUrl

            let template, render
            if (!isProd) {
                // always read fresh template in dev
                try {
                    template = fs.readFileSync(resolve('index.html'), 'utf-8')
                } catch (readErr) {
                    throw new Error(`Failed to read index.html: ${readErr.message}`)
                }
                template = await vite.transformIndexHtml(url, template)
                render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render
            } else {
                try {
                    template = fs.readFileSync(resolve('dist/client/index.html'), 'utf-8')
                } catch (readErr) {
                    throw new Error(`Failed to read dist/client/index.html: ${readErr.message}`)
                }
                render = (await import('./dist/server/entry-server.js')).render
            }

            const appHtml = render(url)
            const html = template.replace(`<!--app-html-->`, appHtml)
            res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
        } catch (e) {
            if (!isProd && vite) {
                vite.ssrFixStacktrace(e)
            }
            console.error(e.stack)
            // Never expose internals to clients in production
            if (isProd) {
                res.status(500).end('Internal Server Error')
            } else {
                res.status(500).end(e.stack)
            }
        }
    })

    return { app }
}

createServer().then(({ app }) =>
    app.listen(3000, () => {
        console.log('http://localhost:3000')
    }),
)
