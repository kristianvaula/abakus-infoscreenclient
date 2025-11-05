// src/components/BusFooter.tsx
"use client";

import React, { useMemo, useEffect, useState, useRef } from "react";
import useBusTimes from "@/hooks/useBusTimes";
import "@/styles/components/bus_footer.css";

const LowEndDetector = () => {
  // simple runtime heuristics for low-power devices
  const [lowGraphics, setLowGraphics] = useState(false);

  useEffect(() => {
    try {
      const cores = navigator.hardwareConcurrency ?? 4;
      // deviceMemory may be undefined in some browsers; treat undefined as ok
      const mem = (navigator as any).deviceMemory ?? 4;
      // if <=2 cores or <=2GB memory -> low device
      if (cores <= 2 || mem <= 2) setLowGraphics(true);
    } catch {
      // ignore
    }
    // also allow user to force reduced-motion or low graphics via query param if needed
    const url = new URL(window.location.href);
    if (url.searchParams.get("lowgraphics") === "1") setLowGraphics(true);
    (window as any).__busFooterLowGraphics = lowGraphics;
  }, []);

  return null;
};

function BusFooterInner() {
  const { data, loading, error } = useBusTimes({
    pollIntervalMs: 30_000,
    busesPerStop: 6,
  });

  // Group stops and limit departures per stop to 5
  const groups = useMemo(() => {
    return (data ?? []).map((stop) => {
      const stopName = stop.stopName ?? stop.stopId;
      const departures = (stop.departures ?? []).slice(0, 5); // first 5 departures
      return { stopId: stop.stopId, stopName, departures };
    });
  }, [data]);

  const hasAnyDeparture = groups.some((g) => (g.departures?.length ?? 0) > 0);

  const renderTrack = useMemo(
    () =>
      (trackGroups: typeof groups) => (
        <div className="ticker-track" aria-hidden="true">
          {trackGroups.map((g) => (
            <div className="ticker-group" key={g.stopId}>
              <span className="stop">{g.stopName}</span>

              <span className="departures" aria-hidden="true">
                {g.departures.map((d, idx) => (
                  <span
                    className="departure"
                    key={`${g.stopId}-${d.lineNo}-${d.departureTimeISO ?? idx}`}
                  >
                    <span className="line" aria-hidden="true">{d.lineNo}</span>
                    <span className="time" aria-hidden="true">{d.displayTime}</span>
                    <span className="route" aria-hidden="true">{d.route}</span>
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      ),
    // only re-create the renderer when group structure type changes (rare)
    []
  );

  return (
    <React.Fragment>
      <LowEndDetector />
      <div className="bus-brand">Busstider</div>

      <div className="bus-ticker" aria-hidden={loading || !!error}>
        {error && <span className="error">Feil ved henting av busstider</span>}
        {!loading && !error && !hasAnyDeparture && (
          <span className="muted">Ingen avganger funnet</span>
        )}

        {!loading && !error && hasAnyDeparture && (
          <div
            className="ticker-scroller"
            style={{ ["--ticker-duration" as any]: "60s" }}
          >
            {renderTrack(groups)}
            {renderTrack(groups)}
          </div>
        )}
      </div>
    </React.Fragment>
  );
}

// memoize the full footer so it only re-renders when props or internal state change
const BusFooter = React.memo(function BusFooter() {
  // determine reduced-graphics class (read from window flag set by detector)
  const [lowGraphics, setLowGraphics] = useState(false);

  useEffect(() => {
    const flag = (window as any).__busFooterLowGraphics;
    if (typeof flag === "boolean") setLowGraphics(flag);
    // also listen for user toggles (optional)
    const onToggle = (e: Event) => {
      const el = e as CustomEvent;
      if (el?.detail?.lowGraphics !== undefined) setLowGraphics(el.detail.lowGraphics);
    };
    window.addEventListener("busFooterToggle", onToggle as EventListener);
    return () => window.removeEventListener("busFooterToggle", onToggle as EventListener);
  }, []);

  return (
    <footer
      className={`bus-footer ${lowGraphics ? "reduced-graphics" : ""}`}
      role="contentinfo"
      aria-label="Bus times"
    >
      <div className="bus-footer-inner">
        <BusFooterInner />
      </div>
    </footer>
  );
});

export default BusFooter;
