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

function formatEvent(event: any) {
  // defensive access
  const title = event.title;
  const cover = event.cover ?? null;
  const coverPlaceholder = event.coverPlaceholder ?? null;
  const eventType = event.eventType ?? null;

  // original python used raw split of the ISO string: "YYYY-MM-DDTHH:MM:SS..."
  // replicate that to preserve original formatting behaviour.
  const startTime: string = event.startTime ?? "";
  let formattedTime = "";
  if (startTime) {
    try {
      const [datePart, timePart] = startTime.split("T");
      const dateParts = (datePart || "").split("-");
      // dateParts = [YYYY, MM, DD]
      const monthStr = dateParts[1] ?? "";
      const dayStr = dateParts[2] ?? "";
      const timePieces = (timePart || "").split(":");
      const hh = timePieces[0] ?? "00";
      const mm = timePieces[1] ?? "00";

      // original formatting: "D. mon, HH:MM"
      const monthIndex = Number(monthStr) - 1;
      const monthName = MONTHS[monthIndex] ?? monthStr;
      const dayNum = Number(dayStr) || 0;
      formattedTime = `${dayNum}. ${monthName}, ${hh}:${mm}`;
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
