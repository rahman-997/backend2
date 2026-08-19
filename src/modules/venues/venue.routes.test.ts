import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../../app.js";

let ownerToken = "";
let otherToken = "";

async function registerUser(label: string): Promise<string> {
  const id = crypto.randomUUID();
  const response = await request(app).post("/v1/auth/register").send({
    name: label,
    email: `${label.toLowerCase().replace(/\s+/g, "-")}-${id}@example.com`,
    password: `Strong-test-password-${id}`,
  });
  expect(response.status).toBe(201);
  return response.body.data.tokens.accessToken as string;
}

const auth = (token = ownerToken) => ({ authorization: `Bearer ${token}` });

beforeAll(async () => {
  ownerToken = await registerUser("Venue Owner");
  otherToken = await registerUser("Other User");
});

describe("/v1/venues", () => {
  it("requires authentication for mutations while reads stay public", async () => {
    const payload = { name: `Protected-${crypto.randomUUID()}`, address: "A", capacity: 10, contactEmail: "protected@example.com" };
    expect((await request(app).post("/v1/venues").send(payload)).status).toBe(401);
    expect((await request(app).get("/v1/venues?limit=10")).status).toBe(200);
  });

  it("creates, reads, updates and deletes an owned venue", async () => {
    const create = await request(app).post("/v1/venues").set(auth()).send({
      name: `Test Venue ${crypto.randomUUID()}`,
      address: "Test Address",
      capacity: 100,
      contactEmail: "test@example.com",
    });
    expect(create.status).toBe(201);
    expect(create.body.data.id).toEqual(expect.any(String));
    expect(create.body.data.ownerUserId).toEqual(expect.any(String));

    const id = create.body.data.id as string;
    expect((await request(app).get(`/v1/venues/${id}`)).status).toBe(200);

    const forbidden = await request(app).patch(`/v1/venues/${id}`).set(auth(otherToken)).send({ capacity: 150 });
    expect(forbidden.status).toBe(403);

    const update = await request(app).patch(`/v1/venues/${id}`).set(auth()).send({ capacity: 200 });
    expect(update.status).toBe(200);
    expect(update.body.data.capacity).toBe(200);

    expect((await request(app).delete(`/v1/venues/${id}`).set(auth())).status).toBe(204);
    expect((await request(app).get(`/v1/venues/${id}`)).status).toBe(404);
  });

  it("rejects an invalid venue UUID", async () => {
    const response = await request(app).get("/v1/venues/not-a-uuid");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("filters capacity inclusively and supports exact ranges", async () => {
    const prefix = `Capacity-${crypto.randomUUID()}`;
    for (const capacity of [50, 100, 150]) {
      expect((await request(app).post("/v1/venues").set(auth()).send({
        name: `${prefix}-${capacity}`,
        address: "A",
        capacity,
        contactEmail: `${capacity}-${crypto.randomUUID()}@example.com`,
      })).status).toBe(201);
    }

    const bounded = await request(app).get(`/v1/venues?search=${prefix}&minCapacity=50&maxCapacity=100&limit=100`);
    expect(bounded.status).toBe(200);
    expect(bounded.body.data.map((v: { capacity: number }) => v.capacity).sort((a: number, b: number) => a - b)).toEqual([50, 100]);

    const exact = await request(app).get(`/v1/venues?search=${prefix}&minCapacity=100&maxCapacity=100&limit=100`);
    expect(exact.status).toBe(200);
    expect(exact.body.data.map((v: { capacity: number }) => v.capacity)).toEqual([100]);
  });

  it("rejects invalid ranges and unsafe pagination", async () => {
    expect((await request(app).get("/v1/venues?minCapacity=101&maxCapacity=100")).status).toBe(400);
    expect((await request(app).get("/v1/venues?minCapacity=-1")).status).toBe(400);
    expect((await request(app).get("/v1/venues?limit=101")).status).toBe(400);
    expect((await request(app).get("/v1/venues?page=10001")).status).toBe(400);
  });

  it("sorts safely and rejects unknown sort fields", async () => {
    const prefix = `Sort-${crypto.randomUUID()}`;
    for (const [suffix, capacity] of [["Low", 100], ["High", 900], ["Mid", 500]] as const) {
      expect((await request(app).post("/v1/venues").set(auth()).send({
        name: `${prefix}-${suffix}`,
        address: suffix,
        capacity,
        contactEmail: `${suffix.toLowerCase()}-${crypto.randomUUID()}@example.com`,
      })).status).toBe(201);
    }
    const asc = await request(app).get(`/v1/venues?search=${prefix}&sortBy=capacity&order=asc&limit=100`);
    expect(asc.body.data.map((v: { capacity: number }) => v.capacity)).toEqual([100, 500, 900]);
    expect((await request(app).get("/v1/venues?sortBy=sql_injection")).status).toBe(400);
  });

  it("rejects case-insensitive duplicate names and invalid input", async () => {
    const name = `Duplicate-${crypto.randomUUID()}`;
    const payload = { name, address: "Address", capacity: 50, contactEmail: "duplicate@example.com" };
    expect((await request(app).post("/v1/venues").set(auth()).send(payload)).status).toBe(201);
    expect((await request(app).post("/v1/venues").set(auth()).send({ ...payload, name: name.toLowerCase() })).status).toBe(409);
    expect((await request(app).post("/v1/venues").set(auth()).send({ ...payload, name: "", capacity: 0, contactEmail: "bad" })).status).toBe(400);
  });
});
