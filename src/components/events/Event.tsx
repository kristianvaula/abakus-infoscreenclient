// Event.tsx
"use client";
import React from "react";
import { EventItem } from "@/types/types";
import "@/styles/components/events.css";
import { getEventTypeLabel, getEventColorHex } from "@/types/eventTypes";

interface Props {
  event: EventItem;
}

export default function Event({ event }: Props) {
  const [registered, total] = (event.capacity?.split("/") ?? []).map(n => Number(n)) as [number, number];
  const safeRegistered = Number.isFinite(registered) ? registered : 0;
  const safeTotal = Number.isFinite(total) ? total : 0;
  const progress = safeTotal > 0 ? Math.max(0, Math.min(100, (safeRegistered / safeTotal) * 100)) : 0;

  return (
    <div className="event-card">
      <div className="event-image">
        {event.cover ? (
          <img src={event.cover} alt={event.title ?? "cover"} className="event-img" />
        ) : (
          <div className="event-noimage">No image</div>
        )}
      </div>

      <div className="event-body">
        <div className="event-top">
          <h3 className="event-title" title={event.title}>{event.title}</h3>
        </div>
        <div className="event-meta">
          <span className="event-time">{event.time}</span>
          <span className="event-sep">•</span>
          <span className="event-type">{getEventTypeLabel(event.eventType || "")}</span>
        </div>
        <div>
          <div 
            className="event-bottom" 
            style={{ backgroundColor: getEventColorHex(event.eventType || "") }}
          >
          </div>
        </div>
      </div>
    </div>
  );
}
