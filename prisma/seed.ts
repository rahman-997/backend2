import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { config } from "../src/config.js";

const adapter = new PrismaPg({ connectionString: config.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ids = {
  organizer: "00000000-0000-0000-0000-000000000001",
  currentUser: "00000000-0000-0000-0000-000000000002",
  admin: "00000000-0000-0000-0000-000000000003",
  parallelEvent: "00000000-0000-0000-0000-000000000100",
};

async function upsertUser(id: string, email: string, name: string, role: "ATTENDEE" | "ORGANIZER" | "ADMIN") {
  return prisma.user.upsert({
    where: { email },
    update: { name, role },
    create: { id, email, name, role, passwordHash: "session-3-no-auth" },
  });
}

async function main() {
  await upsertUser(ids.organizer, "organizer@eventify.test", "Organizer One", "ORGANIZER");
  await upsertUser(ids.currentUser, "current@eventify.test", "Current User", "ATTENDEE");
  await upsertUser(ids.admin, "admin@eventify.test", "Admin One", "ADMIN");

  for (let i = 1; i <= 20; i += 1) {
    const suffix = i.toString().padStart(12, "0");
    await upsertUser(`00000000-0000-0000-0001-${suffix}`, `parallel${i}@eventify.test`, `Parallel User ${i}`, "ATTENDEE");
  }

  const events = [
    { id: ids.parallelEvent, title: "Parallel Capacity Five", capacity: 5 },
    { id: "00000000-0000-0000-0000-000000000101", title: "TypeScript Days", capacity: 50 },
    { id: "00000000-0000-0000-0000-000000000102", title: "Postgres Party", capacity: 100 },
    { id: "00000000-0000-0000-0000-000000000103", title: "API World", capacity: 75 },
    { id: "00000000-0000-0000-0000-000000000104", title: "Testing Guild", capacity: 20 },
  ];

  for (const [index, event] of events.entries()) {
    await prisma.event.upsert({
      where: { id: event.id },
      update: {},
      create: {
        id: event.id,
        title: event.title,
        description: `Seed event ${index + 1}`,
        venue: index % 2 === 0 ? "Main Hall" : "Riverside Loft",
        startsAt: new Date(Date.now() + (index + 1) * 86_400_000),
        capacity: event.capacity,
        priceCents: index * 1000,
        organizerId: ids.organizer,
      },
    });
  }

  await prisma.booking.deleteMany({ where: { eventId: ids.parallelEvent } });
  await prisma.booking.upsert({
    where: { userId_eventId: { userId: ids.currentUser, eventId: events[1]!.id } },
    update: { status: "CONFIRMED" },
    create: { userId: ids.currentUser, eventId: events[1]!.id, status: "CONFIRMED" },
  });
  await prisma.booking.upsert({
    where: { userId_eventId: { userId: "00000000-0000-0000-0001-000000000001", eventId: events[2]!.id } },
    update: { status: "CANCELLED" },
    create: { userId: "00000000-0000-0000-0001-000000000001", eventId: events[2]!.id, status: "CANCELLED" },
  });
}

main()
  .finally(async () => prisma.$disconnect());
