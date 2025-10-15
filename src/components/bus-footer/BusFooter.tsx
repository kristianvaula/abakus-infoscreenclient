// src/components/BusFooter.tsx
"use client";

import React, { useMemo } from "react";
import useBusTimes from "@/hooks/useBusTimes";
import "@/styles/components/bus_footer.css";

export default function BusFooter() {
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

  // Helper to render a single track (we will render two identical tracks for seamless loop)
  const renderTrack = (trackGroups: typeof groups) => (
    <div className="ticker-track" aria-hidden="true">
      {trackGroups.map((g) => (
        <div className="ticker-group" key={g.stopId}>
          <span className="stop">{g.stopName}</span>

          {/* Inline list of departures for this stop */}
          <span className="departures" aria-hidden="true">
            {g.departures.map((d, idx) => (
              <span
                className="departure"
                key={`${g.stopId}-${d.lineNo}-${d.departureTimeISO}-${idx}`}
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
  );

  // Flatten check for empty state
  const hasAnyDeparture = groups.some((g) => (g.departures?.length ?? 0) > 0);

  return (
    <footer className="bus-footer" role="contentinfo" aria-label="Bus times">
      <div className="bus-footer-inner">
        <div className="bus-brand">Busstider</div>

        <div className="bus-ticker" aria-hidden={loading || !!error}>
          {error && <span className="error">Feil ved henting av busstider</span>}
          {!loading && !error && !hasAnyDeparture && (
            <span className="muted">Ingen avganger funnet</span>
          )}

          {/* When we have departures, render the scrolling scroller with two identical tracks */}
          {!loading && !error && hasAnyDeparture && (
            <div
              className="ticker-scroller"
              // optional: tune duration; shorter string -> faster ticker
              style={{ ["--ticker-duration" as any]: "26s" }}
            >
              {renderTrack(groups)}
              {renderTrack(groups)} {/* duplicate for seamless loop */}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
