// Lightweight INP (Interaction to Next Paint) collector
// Tries to use the PerformanceEventTiming API (PerformanceObserver entryType='event')
// and falls back to a DOM-based approximation using setTimeout + requestAnimationFrame

type INPReport = (value: number, details?: Record<string, any>) => void

function percentile(values: number[], p: number) {
  if (!values.length) return 0
  const sorted = values.slice().sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))]
}

export function initINP(report: INPReport) {
  const interactionMax = new Map<number | string | symbol, number>()
  const samples: number[] = []

  function updateAndReport(candidate: number, meta: Record<string, any> = {}) {
    // store sample and compute p95 as the INP metric to report
    samples.push(candidate)
    const inp95 = percentile(samples, 95)
    try {
      report(inp95, { latest: candidate, samples: samples.length, ...meta })
    } catch (e) {
      // swallow reporter errors
      // eslint-disable-next-line no-console
      console.warn('INP reporter failed', e)
    }
  }

  // Try PerformanceEventTiming + PerformanceObserver if available
  try {
    // @ts-ignore - some environments don't yet have PerformanceEventTiming typings
    if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes && (PerformanceObserver.supportedEntryTypes as any).includes('event')) {
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any) {
          // entry is PerformanceEventTiming
          const id = entry.interactionId ?? Symbol()
          // Prefer processingEnd/Start when available, otherwise fall back to duration
          let delay = 0
          if (entry.processingEnd && entry.startTime) {
            delay = entry.processingEnd - entry.startTime
          } else if (entry.duration) {
            delay = entry.duration
          } else if (entry.processingStart && entry.processingEnd) {
            delay = entry.processingEnd - entry.processingStart
          }

          // store max per interaction
          const prev = interactionMax.get(id) || 0
          if (delay > prev) {
            interactionMax.set(id, delay)
            updateAndReport(delay, { interactionId: id, type: entry.name })
          }
        }
      })

      try {
        // Observe event entries for interaction events
        po.observe({ type: 'event', buffered: true })
      } catch (e) {
        // ignore observe errors
      }
    }
  } catch (e) {
    // ignore; fall back to DOM technique below
  }

  // Fallback: approximate INP using event listeners + RAF
  // This captures interactions in browsers that don't support PerformanceEventTiming
  const fallbackEvents = ['pointerdown', 'mousedown', 'keydown', 'touchstart']
  const listener = (ev: Event) => {
    try {
      const start = performance.now()

      // run after event handlers have run
      setTimeout(() => {
        // measure time to next paint
        requestAnimationFrame(() => {
          const paintTime = performance.now()
          const delay = Math.max(0, paintTime - start)
          // use a Symbol-based interaction id per event
          const id = Symbol()
          interactionMax.set(id, delay)
          updateAndReport(delay, { interactionId: String(id), type: ev.type })
        })
      }, 0)
    } catch (e) {
      // swallow
    }
  }

  for (const evName of fallbackEvents) {
    try { window.addEventListener(evName, listener, { passive: true, capture: true }) } catch (e) { }
  }

  // When the page is unloaded, optionally report final INP via the reporter
  const onPageHide = () => {
    if (samples.length === 0) return
    const final = percentile(samples, 95)
    try { report(final, { final: true, samples: samples.length }) } catch (e) { }
  }

  try {
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('beforeunload', onPageHide)
  } catch (e) { }

  return {
    stop() {
      try {
        for (const evName of fallbackEvents) {
          window.removeEventListener(evName, listener, { capture: true } as any)
        }
        window.removeEventListener('pagehide', onPageHide)
        window.removeEventListener('beforeunload', onPageHide)
      } catch (e) { }
    },
    getSamples() {
      return samples.slice()
    }
  }
}

export default initINP
