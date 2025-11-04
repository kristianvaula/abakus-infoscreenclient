
export type PlaylistItem = {
  file?: string | null;
  title?: string | null;
  url?: string | null;
  localName?: string | null;
};

export type EventItem = {
  title: string;
  cover?: string | null;
  coverPlaceholder?: string | null;
  eventType?: string | null;
  time?: string;
  capacity?: string;
};
