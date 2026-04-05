import React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import initWebVitals from './perf/reportWebVitals';

const container = document.getElementById('root')
if (!container) throw new Error("Root element not found")

hydrateRoot(
    container,
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>
)

try {
    initWebVitals();
} catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Failed to initialize web-vitals", e);
}
