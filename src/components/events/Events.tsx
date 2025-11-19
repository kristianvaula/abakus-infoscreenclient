"use client";
import React, { useEffect, useState } from "react";
import Event from "./Event";
import { EventItem } from "@/types/types";
import { EventType } from "@/types/eventTypes";
import "@/styles/components/events.css";

// store lowercase values so comparisons with .toLowerCase() work
const COURSE_TYPES = new Set<string>(
  [EventType.Course, EventType.CompanyPresentation, EventType.BreakfastTalk].map((s) =>
    (s ?? "").toString().toLowerCase()
  )
);

export default function Events() {
  const [sEvents, setSEvents] = useState<EventItem[]>([]); // Social / other events
  const [oEvents, setOEvents] = useState<EventItem[]>([]); // Course-like events

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/events");
        if (!res.ok) throw new Error(`Failed to fetch events (status ${res.status})`);
        const json = await res.json();

        if (!Array.isArray(json)) {
          // if the API returns something unexpected, don't touch existing state
          throw new Error("Events response is not an array");
        }

        // group into two arrays
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
        console.log("Events fetched:", { total: json.length, social: social.length, other: other.length });
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

  return (
    <div className="event_wrapper">
      <div className="event_columns pr-[12px]">
        {sEvents.map((ev) => (
          // prefer a stable key if available; fallback to index only if necessary
          <Event event={ev} key={(ev as any).id ?? JSON.stringify(ev)} />
        ))}
      </div>
      <div className="event_columns pl-[12px]">
        {oEvents.map((ev) => (
          <Event event={ev} key={(ev as any).id ?? JSON.stringify(ev)} />
        ))}
      </div>
    </div>
  );
}
