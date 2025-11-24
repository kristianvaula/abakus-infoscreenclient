"use client";
import React, { useEffect, useRef, useState } from "react";
import Event from "./Event";
import { EventItem } from "@/types/types";
import { EventType } from "@/types/eventTypes";
import "@/styles/components/events.css";

const COURSE_TYPES = new Set<string>(
  [EventType.Course, EventType.CompanyPresentation, EventType.BreakfastTalk].map((s) =>
    (s ?? "").toString().toLowerCase()
  )
);

// How long each event stays open (ms)
const DEFAULT_PAGE_DURATION = 12000;
const FIRST_NUM_EVENTS = 6;

export default function Events() {
  const [sEvents, setSEvents] = useState<EventItem[]>([]); // Social / other events
  const [oEvents, setOEvents] = useState<EventItem[]>([]); // Course-like events

  const [activeIndex, setActiveIndex] = useState(0);

  // use a ref for the timeout id so we can clear reliably
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Memoize Event to avoid re-render when its props do not change.
  // This relies on Event being a pure component (no local changing state that affects render).
  const MemoEvent = React.useMemo(() => React.memo(Event), []);

  // load events from API (keeps original behaviour of hourly refresh)
  useEffect(() => {
    mountedRef.current = true;
    async function load() {
      try {
        const res = await fetch("/api/events");
        if (!res.ok) throw new Error(`Failed to fetch events (status ${res.status})`);
        const json = await res.json();

        if (!Array.isArray(json)) {
          throw new Error("Events response is not an array");
        }

        const social: EventItem[] = [];
        const other: EventItem[] = [];

        (json || []).forEach((ev: any) => {
          const et = (ev.eventType ?? "").toString().toLowerCase();
          if (COURSE_TYPES.has(et)) {
            other.push(ev);
          } else {
            social.push(ev);
          }
        });

        if (mountedRef.current) {
          setSEvents(social);
          setOEvents(other);
        }
      } catch (e) {
        console.error("Failed to load events — keeping current list:", e);
      }
    }

    load();
    const id = window.setInterval(load, 60 * 60 * 1000); // refresh every hour
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, []);

  // reset active index if list lengths change (avoid out-of-bounds)
  useEffect(() => {
    setActiveIndex((i) => (sEvents.length ? Math.min(i, sEvents.length - 1) : 0));
  }, [sEvents.length]);

  useEffect(() => {
    setActiveIndex((i) => (oEvents.length ? Math.min(i, oEvents.length - 1) : 0));
  }, [oEvents.length]);

  // paging loop using a single setTimeout chain (less jitter than repeated setInterval)
  useEffect(() => {
    // clear previous timeout
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // nothing to animate if <= 1 item
    if (!sEvents || sEvents.length <= 1) {
      setActiveIndex(0);
      return;
    }

    // small optimization: only page through up to FIRST_NUM_EVENTS items (keeps behaviour consistent
    // with your original modulus usage), but still preserves list content for rendering.
    const pageCount = Math.max(1, Math.min(FIRST_NUM_EVENTS, sEvents.length));

    const tick = () => {
      // use functional state update to avoid stale closures
      setActiveIndex((prev) => {
        const next = (prev + 1) % pageCount;
        return next;
      });
      // schedule next tick if still mounted and there's more than one item
      if (mountedRef.current && pageCount > 1) {
        timerRef.current = window.setTimeout(tick, DEFAULT_PAGE_DURATION);
      }
    };

    // schedule the first tick after the configured duration
    timerRef.current = window.setTimeout(tick, DEFAULT_PAGE_DURATION);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [sEvents, DEFAULT_PAGE_DURATION]);

  return (
    <div className="event-wrapper">
      <div className="event-columns">
        {sEvents.map((ev, idx) => (
          <MemoEvent
            event={ev}
            key={(ev as any).id ?? JSON.stringify(ev)}
            open={idx === activeIndex}
          />
        ))}
      </div>

      <div className="event-columns">
        {oEvents.map((ev, idx) => (
          <MemoEvent
            event={ev}
            key={(ev as any).id ?? JSON.stringify(ev)}
            open={idx === activeIndex}
          />
        ))}
      </div>
    </div>
  );
}
