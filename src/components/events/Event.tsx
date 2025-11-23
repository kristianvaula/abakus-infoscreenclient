// Event.tsx
"use client";
import React from "react";
import { EventItem } from "@/types/types";
import "@/styles/components/events.css";
import { getEventTypeLabel, getEventColorHex } from "@/types/eventTypes";

interface Props {
  event: EventItem;
  open?: boolean;
}

export default function Event({ event, open = false }: Props) {
  const [registered, total] = (event.capacity?.split("/") ?? []).map(n => Number(n)) as [number, number];

  return (
    <div className={`event-card ${open ? "event-open" : ""}`} title={event.title}>
      <div className="event-image">
        {event.cover ? (
          <img src={event.cover} alt={event.title ?? "cover"} className="event-img" />
        ) : (
          <div className="event-noimage">No image</div>
        )}
      </div>

      <div className="event-body">
        <div className="event-body-inner">
          <div className="event-top">
            <h3 className={`event-title ${open ? "event-title--open" : ""}`} title={event.title}>
              {open ? (event.title ?? "") : (event.title ?? "")}
            </h3>
          </div>

          <div className="event-meta">
            <span className="event-time">{event.time}</span>
            {open ? "" : (<span className="event-sep">•</span>)}
            <span className="event-type">{getEventTypeLabel(event.eventType || "")}</span>
          </div>
        </div>

        <div className="event-bottom-wrap">
          <div
            className="event-bottom"
            style={{ backgroundColor: getEventColorHex(event.eventType || "") }}
          />
        </div>
      </div>
    </div>
  );
}
