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
        // use vite's connect instance as middleware
        app.use(vite.middlewares)
    } else {
        app.use((await import('sirv')).default('dist/client', {
            gzip: true,
            etag: true,
        }))
    }

    app.use(async (req, res, next) => {
        try {
            const url = req.originalUrl

            let template, render
            if (!isProd) {
                // always read fresh template in dev
                template = fs.readFileSync(resolve('index.html'), 'utf-8')
                template = await vite.transformIndexHtml(url, template)
                render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render
            } else {
                template = fs.readFileSync(resolve('dist/client/index.html'), 'utf-8')
                render = (await import('./dist/server/entry-server.js')).render
            }

            const appHtml = render(url)

            const html = template.replace(`<!--app-html-->`, appHtml)

            res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
        } catch (e) {
            if (!isProd && vite) {
                vite.ssrFixStacktrace(e)
            }
            console.log(e.stack)
            res.status(500).end(e.stack)
        }
    })

    return { app }
}

createServer().then(({ app }) =>
    app.listen(3000, () => {
        console.log('http://localhost:3000')
    }),
)
