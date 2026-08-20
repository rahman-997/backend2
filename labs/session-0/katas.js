export function uniqueTags(events) {
  return [...new Set(events.flatMap((event) => event.tags))];
}

export function topByCapacity(events, n) {
  return [...events].sort((a, b) => b.capacity - a.capacity).slice(0, n);
}

export function groupByVenue(events) {
  return events.reduce((groups, event) => {
    (groups[event.venue] ??= []).push(event);
    return groups;
  }, {});
}

export function freeUpcoming(events, now = new Date()) {
  return events.filter((event) => event.priceCents === 0 && new Date(event.startsAt) > now).map((event) => event.title);
}

const sample = [
  { title: "JS 101", venue: "A", capacity: 30, priceCents: 0, startsAt: "2099-01-01T10:00:00Z", tags: ["js", "web"] },
  { title: "Node Deep Dive", venue: "B", capacity: 25, priceCents: 1500, startsAt: "2099-01-02T10:00:00Z", tags: ["node", "js"] },
];
const before = JSON.stringify(sample);
console.log(freeUpcoming(sample));
console.log("totalCapacity:", sample.reduce((sum, event) => sum + event.capacity, 0));
console.log("uniqueTags:", uniqueTags(sample));
console.log("inputMutated:", before !== JSON.stringify(sample));
