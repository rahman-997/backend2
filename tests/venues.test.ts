import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../src/app.js";

const venue = { name: "Main Hall", address: "1 Example Street", capacity: 500, contactEmail: "contact@example.com" };
let token = "";
const auth = () => ({ authorization: `Bearer ${token}` });

beforeAll(async () => {
  const id = crypto.randomUUID();
  const response = await request(app).post("/v1/auth/register").send({
    name: "Legacy Venue Test User",
    email: `legacy-venue-${id}@example.com`,
    password: `Strong-test-password-${id}`,
  });
  expect(response.status).toBe(201);
  token = response.body.data.tokens.accessToken;
});

describe("/v1/venues legacy contract", () => {
  it("creates and lists with pagination", async () => {
    const suffix = crypto.randomUUID();
    const created = await request(app).post("/v1/venues").set(auth()).send({ ...venue, name: `Main-${suffix}` });
    expect(created.status).toBe(201);
    expect(created.body.data.ownerUserId).toEqual(expect.any(String));
    const list = await request(app).get("/v1/venues?page=1&limit=1");
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.pagination.page).toBe(1);
  });

  it("searches and filters", async () => {
    const suffix = crypto.randomUUID();
    await request(app).post("/v1/venues").set(auth()).send({ ...venue, name: `Search-${suffix}`, capacity: 2000 });
    const response = await request(app).get(`/v1/venues?search=${suffix}&minCapacity=1000`);
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  it("gets, patches and deletes an owned venue", async () => {
    const created = await request(app).post("/v1/venues").set(auth()).send({ ...venue, name: `Lifecycle-${crypto.randomUUID()}` });
    const id = created.body.data.id;
    expect((await request(app).get(`/v1/venues/${id}`)).status).toBe(200);
    const patched = await request(app).patch(`/v1/venues/${id}`).set(auth()).send({ capacity: 750 });
    expect(patched.status).toBe(200);
    expect(patched.body.data.capacity).toBe(750);
    expect((await request(app).delete(`/v1/venues/${id}`).set(auth())).status).toBe(204);
    expect((await request(app).get(`/v1/venues/${id}`)).status).toBe(404);
  });

  it("returns 404 for missing venue", async () => {
    expect((await request(app).get(`/v1/venues/${crypto.randomUUID()}`)).status).toBe(404);
  });

  it("rejects duplicate names", async () => {
    const name = `Duplicate-${crypto.randomUUID()}`;
    await request(app).post("/v1/venues").set(auth()).send({ ...venue, name });
    expect((await request(app).post("/v1/venues").set(auth()).send({ ...venue, name })).status).toBe(409);
  });

  it("rejects invalid input and empty patch", async () => {
    expect((await request(app).post("/v1/venues").set(auth()).send({ ...venue, capacity: 0, contactEmail: "bad" })).status).toBe(400);
    const created = await request(app).post("/v1/venues").set(auth()).send({ ...venue, name: `Empty-${crypto.randomUUID()}` });
    expect((await request(app).patch(`/v1/venues/${created.body.data.id}`).set(auth()).send({})).status).toBe(400);
  });

  it("rejects invalid capacity range", async () => {
    expect((await request(app).get("/v1/venues?minCapacity=500&maxCapacity=100")).status).toBe(400);
  });

  it("rejects unauthenticated mutation", async () => {
    expect((await request(app).post("/v1/venues").send({ ...venue, name: `NoAuth-${crypto.randomUUID()}` })).status).toBe(401);
  });
});
