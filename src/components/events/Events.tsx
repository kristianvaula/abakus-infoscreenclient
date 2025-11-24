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
const DEFAULT_PAGE_DURATION = 10000;
const FIRST_NUM_EVENTS = 6

export default function Events() {
  const [sEvents, setSEvents] = useState<EventItem[]>([]); // Social / other events
  const [oEvents, setOEvents] = useState<EventItem[]>([]); // Course-like events

  const [activeIndex, setActiveIndex] = useState(0);

  // timeout id for paging
  const timerRef = useRef<number | null>(null);
  // mounted flag
  const mountedRef = useRef(true);
  // true if we allow cycling (false => disabled to save resources)
  const [cyclingAllowed, setCyclingAllowed] = useState(true);

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

  // keep active index in bounds when lists change
  useEffect(() => {
    setActiveIndex((i) => (sEvents.length ? Math.min(i, sEvents.length - 1) : 0));
  }, [sEvents.length]);

  useEffect(() => {
    setActiveIndex((i) => (oEvents.length ? Math.min(i, oEvents.length - 1) : 0));
  }, [oEvents.length]);

  // QUICK rAF probe to detect slow devices (very small cost)
  // If device is slow (avg frame > 40ms) => disable cycling to save CPU.
  useEffect(() => {
    let rafId = 0;
    let frames = 0;
    let last = performance.now();
    let sum = 0;
    const MAX_FRAMES = 6;

    function step() {
      const now = performance.now();
      sum += now - last;
      last = now;
      frames += 1;
      if (frames < MAX_FRAMES) {
        rafId = requestAnimationFrame(step);
      } else {
        const avg = sum / frames; // ms per frame
        const SLOW_THRESHOLD = 30; // > ~25 FPS is considered slow; tweak if needed

        if (avg > SLOW_THRESHOLD) {
          // disable cycling and add a class to disable transitions
          setCyclingAllowed(false);
          try { document.documentElement.classList.add("no-motion"); } catch {}
          console.warn(`Device appears slow (avg frame ${Math.round(avg)}ms) — disabling event cycling.`);
        } else {
          setCyclingAllowed(true);
          try { document.documentElement.classList.remove("no-motion"); } catch {}
        }
      }
    }

    rafId = requestAnimationFrame(step);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []); // run only once on mount

  // paging loop using single setTimeout chain — lightweight, pauses when page hidden
  useEffect(() => {
    // clear previous timeout
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // don't start if cycling disabled or not enough events
    if (!cyclingAllowed || !sEvents || sEvents.length <= 1) {
      setActiveIndex(0);
      return;
    }

    // respect FIRST_NUM_EVENTS behaviour but don't exceed list length
    const pageCount = Math.max(1, Math.min(FIRST_NUM_EVENTS, sEvents.length));

    // visibility handling — pause when not visible
    function handleVisibility() {
      if (document.hidden) {
        if (timerRef.current) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      } else {
        // resume scheduling from current index
        timerRef.current = window.setTimeout(tick, DEFAULT_PAGE_DURATION);
      }
    }

    // tick function schedules itself
    const tick = () => {
      if (!mountedRef.current) return;
      setActiveIndex((prev) => (prev + 1) % pageCount);
      // schedule next only if still allowed and page visible
      if (mountedRef.current && cyclingAllowed && pageCount > 1 && !document.hidden) {
        timerRef.current = window.setTimeout(tick, DEFAULT_PAGE_DURATION);
      }
    };

    // start the chain
    timerRef.current = window.setTimeout(tick, DEFAULT_PAGE_DURATION);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [sEvents, cyclingAllowed]); // rerun if events or cyclingAllowed changes

  return (
    <div className="event-wrapper">
      <div className="event-columns">
        {sEvents.map((ev, idx) => (
          <Event
            event={ev}
            key={(ev as any).id ?? JSON.stringify(ev)}
            open={idx === activeIndex}
          />
        ))}
      </div>

      <div className="event-columns">
        {oEvents.map((ev, idx) => (
          <Event
            event={ev}
            key={(ev as any).id ?? JSON.stringify(ev)}
            open={idx === activeIndex}
          />
        ))}
      </div>
    </div>
  );
}
