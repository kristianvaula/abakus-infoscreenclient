// app/api/events/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs"; // we do network + filesystem-safe work

const MONTHS = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];

function getDateRangeQuery() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const dateAfter = `${yyyy}-${mm}-${dd}`;
  const nextYear = yyyy + 1;
  const dateBefore = `${nextYear}-${mm}-${dd}`;

  // replicate original behavior: page_size=30 and same param names
  return `?date_after=${dateAfter}&date_before=${dateBefore}&page_size=30`;
}

function toUtcDate(startTime: string): Date | null {
  if (!startTime) return null;

  // if string contains 'Z' or timezone offset like +01:00 or -05:00, leave it.
  const hasTz = /[zZ]$|[+\-]\d{2}:\d{2}$/.test(startTime);
  const canonical = hasTz ? startTime : `${startTime}Z`;

  const d = new Date(canonical);
  if (isNaN(d.getTime())) return null;
  return d;
}

function formatEvent(event: any) {
  // defensive access
  const title = event.title;
  const cover = event.cover ?? null;
  const coverPlaceholder = event.coverPlaceholder ?? null;
  const eventType = event.eventType ?? null;

  const startTime: string = event.startTime ?? "";
  let formattedTime = "";

  if (startTime) {
    try {
      const utcDate = toUtcDate(startTime);

      if (!utcDate) {
        formattedTime = startTime;
      } else {
        // Preferred: use Intl to convert to Europe/Oslo (handles DST properly).
        // We'll extract day, month, hour, minute from formatToParts.
        try {
          const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/Oslo",
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).formatToParts(utcDate);

          const dayPart = parts.find(p => p.type === "day")?.value ?? "01";
          const monthPart = parts.find(p => p.type === "month")?.value ?? "01";
          const hourPart = parts.find(p => p.type === "hour")?.value ?? "00";
          const minutePart = parts.find(p => p.type === "minute")?.value ?? "00";

          const monthIndex = Math.max(0, Number(monthPart) - 1);
          const monthName = MONTHS[monthIndex] ?? monthPart;
          const dayNum = Number(dayPart) || 0;

          formattedTime = `${dayNum}. ${monthName}, ${hourPart}:${minutePart}`;
        } catch (intlErr) {
          // Fallback: do a simple +1 hour arithmetic on the UTC date.
          const d = new Date(utcDate.getTime());
          // add 1 hour (simple fixed +1, doesn't account for DST)
          d.setUTCHours(d.getUTCHours() + 1);

          const dayNum = d.getUTCDate();
          const monthIndex = d.getUTCMonth(); // 0-based
          const hh = String(d.getUTCHours()).padStart(2, "0");
          const mm = String(d.getUTCMinutes()).padStart(2, "0");
          const monthName = MONTHS[monthIndex] ?? String(monthIndex + 1).padStart(2, "0");

          formattedTime = `${dayNum}. ${monthName}, ${hh}:${mm}`;
        }
      }
    } catch {
      formattedTime = startTime;
    }
  }

  // capacity string as "registrationCount/totalCapacity"
  const registrationCount = event.registrationCount ?? 0;
  const totalCapacity = event.totalCapacity ?? 0;
  const capacity = `${registrationCount}/${totalCapacity}`;

  return {
    title,
    cover,
    coverPlaceholder,
    eventType,
    time: formattedTime,
    capacity,
  };
}


export async function GET() {
  try {
    const base = "https://lego.abakus.no/api/v1/events";
    const url = base + getDateRangeQuery();

    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      console.error("events fetch failed:", res.status, await res.text().catch(() => "<no-body>"));
      return NextResponse.json([], { status: 502 });
    }

    const json = await res.json().catch(() => null);
    if (!json || !Array.isArray(json.results) && !Array.isArray(json)) {
      // older API returned a top-level array (some variations exist). Try both.
      const alt = Array.isArray(json) ? json : (json?.results ?? []);
      const items = (alt || []).map(formatEvent);
      return NextResponse.json(items);
    }

    // primary path: json.results is an array
    const eventsArray = Array.isArray(json.results) ? json.results : json;
    const items = (eventsArray || []).map(formatEvent);
    return NextResponse.json(items);
  } catch (err) {
    console.error("events route error:", err);
    return NextResponse.json([], { status: 500 });
  }
}