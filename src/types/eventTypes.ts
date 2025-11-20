export enum EventType {
  Course = "course",
  CompanyPresentation = "company_presentation",
  Gala = "gala",
  Social = "social",
  Other = "other",
  BreakfastTalk = "breakfast_talk",
  party = "party",
  alternative_presentation = "alternative_presentation",
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  course: "Kurs",
  company_presentation: "Bedriftspresentasjon",
  gala: "Galla",
  social: "Sosialt",
  other: "Annet",
  breakfast_talk: "Frokostforedrag",
  party: "Fest",
  alternative_presentation: "Alternativ bedpres",
};

export function getEventTypeLabel(type?: string): string {
  if (!type) return "Annet";
  return EVENT_TYPE_LABELS[type.toLowerCase()] ?? type;
}