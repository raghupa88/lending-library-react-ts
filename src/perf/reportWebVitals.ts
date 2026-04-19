import { getCLS, getFID, getLCP, getTTFB, Metric } from 'web-vitals'
import initINP from './inp'

const PERF_ENDPOINT = import.meta.env.VITE_PERF_ENDPOINT || ''

function sendMetric(metric: Metric) {
  const payload = {
    name: metric.name,
    value: metric.value,
    delta: metric.delta,
    id: metric.id,
    entries: metric.entries || undefined,
    url: location.pathname + location.search,
    userAgent: navigator.userAgent,
    connection: (navigator as any).connection?.effectiveType || null,
    timestamp: Date.now(),
  }

  // Prefer sendBeacon for reliability on unload, fall back to fetch
  try {
    if (PERF_ENDPOINT && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      navigator.sendBeacon(PERF_ENDPOINT, blob)
    } else if (PERF_ENDPOINT) {
      fetch(PERF_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // swallow network errors
      })
    } else {
      // No endpoint configured — useful for local/dev debugging
      // eslint-disable-next-line no-console
      console.log('perf-metric', payload)
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Failed to send perf metric', e)
  }
}

export function initWebVitals() {
  try {
    getCLS(sendMetric)
    getFID(sendMetric)
    getLCP(sendMetric)
    getTTFB(sendMetric)
    // INP may not be available in all environments; if present in the web-vitals bundle it will be
    // reported automatically by the library when supported. We intentionally avoid importing
    // getINP directly to maintain compatibility across web-vitals versions.
    // Initialize INP collector (fallbacks to in-page approximation when necessary)
    try {
      initINP((value, details) => {
        // construct a lightweight metric-like object for sendMetric
        const metric = {
          name: 'INP',
          value,
          id: `inp-${Date.now()}`,
          delta: value,
          entries: undefined,
          ...(details || {}),
        } as unknown as Metric
        sendMetric(metric)
      })
    } catch (e) {
      // ignore init errors
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('web-vitals failed to initialize', e)
  }
}

export function reportMetric(metric: Metric) {
  sendMetric(metric)
}

export default initWebVitals
