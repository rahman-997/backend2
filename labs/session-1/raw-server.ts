import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

type EventItem = {
  id: string;
  title: string;
  description: string;
  venue: string;
  startsAt: string;
  capacity: number;
  priceCents: number;
  organizerId: string;
  createdAt: string;
};

let cachedEvents: EventItem[] | null = null;
async function loadEvents(): Promise<EventItem[]> {
  if (cachedEvents) return cachedEvents;
  const path = fileURLToPath(new URL("./data/events.json", import.meta.url));
  cachedEvents = JSON.parse(await readFile(path, "utf8")) as EventItem[];
  return cachedEvents;
}

const json = (res: import("node:http").ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") return json(res, 200, { status: "ok" });
  if (req.method === "GET" && req.url === "/events") {
    try {
      return json(res, 200, await loadEvents());
    } catch (error) {
      console.error("Could not load Session 1 events", error);
      return json(res, 500, { error: "Could not load events" });
    }
  }
  return json(res, 404, { error: "Not found" });
}).listen(3000, "0.0.0.0", () => console.log("Session 1 raw Eventify on :3000"));
