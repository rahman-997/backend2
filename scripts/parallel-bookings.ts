import fixture from "./fixtures/parallel-users.json" with { type: "json" };

const statuses = new Map<number, number>();

const responses = await Promise.all(
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
    return response;
  }),
);

console.log(Object.fromEntries([...statuses.entries()].sort(([a], [b]) => a - b)));
const created = statuses.get(201) ?? 0;
if (created > fixture.capacity) process.exitCode = 1;
void responses;
