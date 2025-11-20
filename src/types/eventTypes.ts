export enum EventType {
  Course = "course",
  CompanyPresentation = "company_presentation",
  Gala = "gala",
  Social = "social",
  Other = "other",
  BreakfastTalk = "breakfast_talk",
  Party = "party",
  Alternative_presentation = "alternative_presentation",
  Event = "event",
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  course: "Kurs",
  event: "Arrangement",
  company_presentation: "Bedriftspresentasjon",
  gala: "Galla",
  social: "Sosialt",
  other: "Annet",
  breakfast_talk: "Frokostforedrag",
  party: "Fest",
  alternative_presentation: "Alternativ bedpres",
};

export const EVENT_TYPE_HEX: Record<string, string> = {
  course: "#52b0ec",
  company_presentation: "#a1c34a",
  gala: "#ffd700",
  event: "#b11c11",
  social: "#b11c11",
  other: "#dddddd",
  breakfast_talk: "#52b0ec",
  party: "#ffd700",
  alternative_presentation: "#8a2be2",
};

export function getEventTypeLabel(type?: string): string {
  if (!type) return "Annet";
  return EVENT_TYPE_LABELS[type.toLowerCase()] ?? type;
}

export function getEventColorHex(type?: string): string {
  if (!type) return "#b11c11";
  return EVENT_TYPE_HEX[type.toLowerCase()] ?? type;
}