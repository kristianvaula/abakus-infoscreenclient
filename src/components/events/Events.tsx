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

  const timerRef = useRef<number | null>(null);

  // load events from API (keeps original behaviour of hourly refresh)
  useEffect(() => {
    let mounted = true;

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

        if (mounted) {
          setSEvents(social);
          setOEvents(other);
        }
      } catch (e) {
        console.error("Failed to load events — keeping current list:", e);
      }
    }

    load();
    const id = setInterval(load, 60 * 60 * 1000); // refresh every hour
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  // reset active index if list changes (avoid out-of-bounds)
  useEffect(() => {
    setActiveIndex((i) => (sEvents.length ? Math.min(i, sEvents.length - 1) : 0));
  }, [sEvents.length]);

  useEffect(() => {
    setActiveIndex((i) => (oEvents.length ? Math.min(i, oEvents.length - 1) : 0));
  }, [oEvents.length]);

  // social column paging
  useEffect(() => {
    // clear any existing timer
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (sEvents.length <= 1) return; // nothing to page or paused

    timerRef.current = window.setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % Math.max(1, FIRST_NUM_EVENTS);
        return next;
      });
    }, DEFAULT_PAGE_DURATION);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [sEvents.length]);

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
