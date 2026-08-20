export type EventItem = {
  title: string;
  venue: string;
  capacity: number;
  priceCents: number;
  startsAt: string;
  tags: string[];
};

export const uniqueTags = (events: EventItem[]): string[] => [...new Set(events.flatMap((event) => event.tags))];
export const topByCapacity = (events: EventItem[], n: number): EventItem[] => [...events].sort((a, b) => b.capacity - a.capacity).slice(0, n);
export const groupByVenue = (events: EventItem[]): Record<string, EventItem[]> =>
  events.reduce<Record<string, EventItem[]>>((groups, event) => {
    (groups[event.venue] ??= []).push(event);
    return groups;
  }, {});
export const freeUpcoming = (events: EventItem[], now = new Date()): string[] =>
  events.filter((event) => event.priceCents === 0 && new Date(event.startsAt) > now).map((event) => event.title);
