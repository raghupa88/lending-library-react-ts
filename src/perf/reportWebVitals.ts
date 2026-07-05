import { onCLS, onINP, onLCP, onTTFB, onFCP, type Metric } from "web-vitals";

const PERF_ENDPOINT = import.meta.env.VITE_PERF_ENDPOINT || "";

function sendMetric(metric: Metric) {
  const payload = {
    name: metric.name,
    value: metric.value,
    delta: metric.delta,
    id: metric.id,
    url: location.pathname + location.search,
    timestamp: Date.now(),
  };

  try {
    if (PERF_ENDPOINT && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      navigator.sendBeacon(PERF_ENDPOINT, blob);
    } else if (PERF_ENDPOINT) {
      fetch(PERF_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Never let metrics reporting break the app
  }
}

export function initWebVitals() {
  onCLS(sendMetric);
  onINP(sendMetric);
  onLCP(sendMetric);
  onFCP(sendMetric);
  onTTFB(sendMetric);
}
