"use client";
import React, { useEffect, useState } from "react";
import Event from "./Event";
import { EventItem } from "@/types/types";
import { EventType } from "@/types/eventTypes";
import "@/styles/components/events.css";

const COURSE_TYPES = new Set<string>([
  EventType.Course,
  EventType.CompanyPresentation,
  EventType.BreakfastTalk,
]);

export default function Events() {
  const [sEvents, setSEvents] = useState<EventItem[]>([]); // Social / other events
  const [oEvents, setOEvents] = useState<EventItem[]>([]); // Course-like events

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/events");
        if (!res.ok) throw new Error("Failed to fetch events");
        const json = await res.json();
        // group into two arrays
        const social: EventItem[] = [];
        const other: EventItem[] = [];

        (json || []).forEach((ev: any) => {
          // normalize eventType to string (lowercase) for safe comparison
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
        console.error("Failed to load events:", e);
        if (mounted) {
          setSEvents([]);
          setOEvents([]);
        }
      }
    }
    load();
    const id = setInterval(load, 60 * 60 * 1000); // refresh every hour
    return () => { mounted = false; clearInterval(id); };
  }, []);
  
  return (
    <div className="event_wrapper">
      <div className="event_columns pr-[12px]">
        {sEvents.map((ev, idx) => (
          <Event event={ev} key={idx} />
        ))}
      </div>
      <div className="event_columns pl-[12px]">
        {oEvents.map((ev, idx) => (
          <Event event={ev} key={idx} />
        ))}
      </div>
    </div>
  );
}