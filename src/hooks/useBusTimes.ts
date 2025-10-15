import { useEffect, useRef, useState, useCallback } from "react";

/* ---------- Types ---------- */
export type BusDeparture = {
  stopId: string; // quay id like "NSR:Quay:75708"
  departureTimeISO: string; // raw ISO time from API
  displayTime: string; // "nå", "3 min" or "14:32"
  minutesUntil: number | null; // minutes until departure (null if unknown/past)
  lineNo: string; // e.g. "8", "B1"
  route: string; // truncated human route text
};

export type StopDepartures = {
  stopId: string;
  stopName?: string | null;
  departures: BusDeparture[];
};

type UseBusTimesOpts = {
  stopIds?: number[]; // numeric id(s) from Entur (e.g. 75708)
  busesPerStop?: number;
  pollIntervalMs?: number;
};

/*
75708  Gløshaugen nord
71204  Hesthagen nord
71939  Høgskoleringen nord
75707  Gløshaugen sør
102719 Hesthagen sør
71940  Høgskoleringen sør
*/
const DEFAULT_STOP_IDS = [75708, 75707];
const DEFAULT_BUSES_PER_STOP = 10;
const DEFAULT_POLL_INTERVAL_MS = 30_000;
const ENTUR_GRAPHQL_URL = "https://api.entur.io/journey-planner/v3/graphql";

/** zero-pad number to 2 digits */
const z2 = (n: number) => String(n).padStart(2, "0");

/** Format display time like Python: "nå", "3 min" (<=10), otherwise "HH:MM" */
function formatDepartureDisplay(departureISO: string, nowDate = new Date()): { displayTime: string; minutesUntil: number | null } {
  try {
    const departure = new Date(departureISO);
    if (isNaN(departure.getTime())) return { displayTime: "", minutesUntil: null };

    // difference in minutes, rounded down for user-friendly display
    const diffMs = departure.getTime() - nowDate.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin <= 0) {
      return { displayTime: "nå", minutesUntil: 0 };
    }
    if (diffMin <= 10) {
      return { displayTime: `${diffMin} min`, minutesUntil: diffMin };
    }
    // else show HH:MM in local timezone
    return {
      displayTime: `${z2(departure.getHours())}:${z2(departure.getMinutes())}`,
      minutesUntil: diffMin,
    };
  } catch {
    return { displayTime: "", minutesUntil: null };
  }
}

function extractLineNumber(lineId: string | undefined | null): string {
  if (!lineId) return "";
  const parts = lineId.split(":");
  const last = parts[parts.length - 1] ?? "";
  if (last.includes("_")) {
    return last.split("_").pop() ?? last;
  }
  return last;
}

async function fetchStopDepartures(stopIdNum: number, busesPerStop = DEFAULT_BUSES_PER_STOP, signal?: AbortSignal): Promise<StopDepartures> {
  const stopId = `NSR:Quay:${stopIdNum}`;
  const timeRange = 72100; // same as your Python script
    const query = `
    query QuayDepartures($id: String!, $startTime: DateTime!, $numberOfDepartures: Int!, $timeRange: Int!) {
        quay(id: $id) {
        id
        name
        estimatedCalls(startTime: $startTime, timeRange: $timeRange, numberOfDepartures: $numberOfDepartures) {
            expectedDepartureTime
            destinationDisplay { frontText }
            serviceJourney {
            journeyPattern {
                line {
                id
                name
                transportMode
                }
            }
            }
        }
        }
    }
    `;

    // create ISO string for startTime. Example with milliseconds stripped:
    const nowIso = new Date().toISOString();
    const startTimeIso = nowIso.replace(/\.\d{3}Z$/, "Z"); // optional: remove ms

    const variables = {
    id: stopId,
    startTime: startTimeIso,       // DateTime scalar expects an ISO datetime
    numberOfDepartures: busesPerStop,
    timeRange,
    };

  const res = await fetch(ENTUR_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Good practice to set a client name for Entur
      "ET-Client-Name": "abakus-infoscreen-client",
    },
    body: JSON.stringify({ query, variables }),
    signal,
  });

  if (!res.ok) {
    // Throw so caller can handle retries / logging
    const text = await res.text().catch(() => "");
    throw new Error(`Entur API HTTP ${res.status}: ${text}`);
  }

  const json = await res.json().catch(() => ({}));
  const quay = json?.data?.quay;
  if (!quay) {
    return { stopId, stopName: null, departures: [] };
  }

  const now = new Date();
  const estimatedCalls = quay.estimatedCalls ?? [];

  const departures: BusDeparture[] = estimatedCalls.slice(0, busesPerStop).map((call: any) => {
    const expectedDepartureTime: string = call.expectedDepartureTime;
    const { displayTime, minutesUntil } = formatDepartureDisplay(expectedDepartureTime, now);
    const lineId: string | undefined = call?.serviceJourney?.journeyPattern?.line?.id;
    const routeText: string = call?.destinationDisplay?.frontText ?? "";

    let route = routeText.trim();
    if (route.length > 24) route = route.slice(0, 22) + "..";

    return {
      stopId: quay.id,
      departureTimeISO: expectedDepartureTime,
      displayTime,
      minutesUntil,
      lineNo: extractLineNumber(lineId),
      route,
    };
  });

  return {
    stopId: quay.id,
    stopName: quay.name ?? null,
    departures,
  };
}

/* ---------- Hook ---------- */
export default function useBusTimes(opts?: UseBusTimesOpts) {
  const stopIds = opts?.stopIds ?? DEFAULT_STOP_IDS;
  const busesPerStop = opts?.busesPerStop ?? DEFAULT_BUSES_PER_STOP;
  const pollIntervalMs = opts?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  const [data, setData] = useState<StopDepartures[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // allow canceling in-flight requests on unmount/refresh
  const abortControllersRef = useRef<AbortController[]>([]);
  const mountedRef = useRef(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    // abort any previous requests
    abortControllersRef.current.forEach((c) => c.abort());
    abortControllersRef.current = [];

    try {
      const promises = stopIds.map((id) => {
        const controller = new AbortController();
        abortControllersRef.current.push(controller);
        return fetchStopDepartures(id, busesPerStop, controller.signal);
      });

      const results = await Promise.all(promises);
      if (mountedRef.current) {
        setData(results);
        setLoading(false);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    }
  }, [stopIds, busesPerStop]);

  useEffect(() => {
    mountedRef.current = true;
    // initial load
    fetchAll();

    // schedule interval
    const id = setInterval(() => {
      fetchAll();
    }, pollIntervalMs);

    return () => {
      mountedRef.current = false;
      clearInterval(id);
      abortControllersRef.current.forEach((c) => c.abort());
    };
  }, [fetchAll, pollIntervalMs]);

  // manual refresh helper
  const refresh = useCallback(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, loading, error, refresh };
}