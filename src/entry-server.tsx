import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

export function render(url: string): string {
    // Guard against non-string or empty url values from the server layer
    const safeUrl = typeof url === 'string' && url.length > 0 ? url : '/'

    try {
        return ReactDOMServer.renderToString(
            <React.StrictMode>
                <StaticRouter location={safeUrl}>
                    <ErrorBoundary>
                        <App />
                    </ErrorBoundary>
                </StaticRouter>
            </React.StrictMode>
        )
    } catch (error) {
        // Log full error server-side; return a safe fallback fragment to the caller
        console.error('[SSR] render error:', error)
        return '<div style="padding:20px;text-align:center"><h2>Something went wrong</h2></div>'
    }
}
