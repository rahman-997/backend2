import fixture from "./fixtures/parallel-users.json" with { type: "json" };

const statuses = new Map<number, number>();
const bookingStates = new Map<string, number>();

await Promise.all(
  fixture.users.map(async (user) => {
    const response = await fetch(`${fixture.baseUrl}/v1/bookings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(user.token ? { authorization: `Bearer ${user.token}` } : {}),
        "x-eventify-test-user": user.userId,
      },
      body: JSON.stringify({ eventId: fixture.eventId }),
    });
    statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
    const body = (await response.json().catch(() => null)) as { status?: string } | null;
    if (body?.status) bookingStates.set(body.status, (bookingStates.get(body.status) ?? 0) + 1);
  }),
);

console.log({ http: Object.fromEntries(statuses), bookings: Object.fromEntries(bookingStates) });
const confirmed = bookingStates.get("CONFIRMED") ?? 0;
if (confirmed > fixture.capacity) {
  console.error(`Oversold: ${confirmed} confirmed for capacity ${fixture.capacity}`);
  process.exitCode = 1;
}
