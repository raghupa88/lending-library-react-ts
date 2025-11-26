import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { getLCP, getCLS, Metric } from "web-vitals";
import { reportMetric } from "./reportWebVitals";

const RoutePerfObserver: React.FC = () => {
  const location = useLocation();
  const routeId = useRef(0);

  useEffect(() => {
    // Increment routeId to uniquely mark this navigation
    routeId.current += 1;
    const id = routeId.current;
    const routeName = location.pathname || "unknown";

    // Mark route start (useful if we add custom marks later)
    try {
      performance?.mark?.(`route-start-${id}`);
    } catch (e) {
      // ignore
    }

    // Observe LCP for this route navigation — web-vitals will call us with the closest LCP
    const lcpCallback = (metric: Metric) => {
      // Attach route context and forward
      const routeMetric = { ...metric, route: routeName };
      reportMetric(routeMetric as Metric);
    };

    try {
      const stop = getLCP(lcpCallback);
      // Also capture any CLS that occurs during route load
      getCLS((m) => reportMetric({ ...m, route: routeName } as Metric));

      // cleanup when location changes again
      return () => {
        try {
          performance?.mark?.(`route-end-${id}`);
        } catch (e) {
          // ignore
        }
        // stop() is provided by web-vitals as the return of getLCP in some browsers; guard
        if (typeof stop === "function") {
          try {
            (stop as Function)();
          } catch (e) {}
        }
      };
    } catch (e) {
      // ignore
    }
  }, [location]);

  return null;
};

export default RoutePerfObserver;
