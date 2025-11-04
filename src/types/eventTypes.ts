export enum EventType {
  Course = "course",
  CompanyPresentation = "company_presentation",
  Gala = "gala",
  Social = "social",
  Other = "other",
  BreakfastTalk = "breakfast_talk",
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  course: "Kurs",
  company_presentation: "Bedriftspresentasjon",
  gala: "Galla",
  social: "Sosialt",
  other: "Other",
  breakfast_talk: "Frokostforedrag"
};

export function getEventTypeLabel(type?: string): string {
  if (!type) return "Annet";
  return EVENT_TYPE_LABELS[type.toLowerCase()] ?? type;
}