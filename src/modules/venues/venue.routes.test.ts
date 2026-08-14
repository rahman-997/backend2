import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../app.js";

describe("/v1/venues", () => {
  it("creates, reads, updates and deletes a venue", async () => {
    const create = await request(app).post("/v1/venues").send({
      name: "Test Venue",
      address: "Test Address",
      capacity: 100,
      contactEmail: "test@example.com",
    });

    expect(create.status).toBe(201);
    expect(create.body.data.id).toEqual(expect.any(String));
    expect(create.body.data.createdAt).toEqual(expect.any(String));

    const id = create.body.data.id;

    const list = await request(app).get("/v1/venues?limit=10");
    expect(list.status).toBe(200);
    expect(list.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id, name: "Test Venue" }),
    ]));

    const get = await request(app).get(`/v1/venues/${id}`);
    expect(get.status).toBe(200);

    const update = await request(app)
      .patch(`/v1/venues/${id}`)
      .send({ capacity: 200 });
    expect(update.status).toBe(200);
    expect(update.body.data.capacity).toBe(200);

    const remove = await request(app).delete(`/v1/venues/${id}`);
    expect(remove.status).toBe(204);

    const missing = await request(app).get(`/v1/venues/${id}`);
    expect(missing.status).toBe(404);
  });

  it("rejects an invalid venue UUID", async () => {
    const response = await request(app).get("/v1/venues/not-a-uuid");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("filters venues with minCapacity and maxCapacity inclusively", async () => {
    const venues = [
      { name: "Capacity 50", address: "A", capacity: 50, contactEmail: "a@example.com" },
      { name: "Capacity 100", address: "B", capacity: 100, contactEmail: "b@example.com" },
      { name: "Capacity 150", address: "C", capacity: 150, contactEmail: "c@example.com" },
    ];

    for (const venue of venues) {
      expect((await request(app).post("/v1/venues").send(venue)).status).toBe(201);
    }

    const bounded = await request(app).get("/v1/venues?minCapacity=50&maxCapacity=100&limit=100");
    expect(bounded.status).toBe(200);
    expect(bounded.body.data.map((v: { capacity: number }) => v.capacity).sort((a: number, b: number) => a - b))
      .toEqual([50, 100]);

    const minimumOnly = await request(app).get("/v1/venues?minCapacity=100&limit=100");
    expect(minimumOnly.status).toBe(200);
    expect(minimumOnly.body.data.every((v: { capacity: number }) => v.capacity >= 100)).toBe(true);

    const maximumOnly = await request(app).get("/v1/venues?maxCapacity=100&limit=100");
    expect(maximumOnly.status).toBe(200);
    expect(maximumOnly.body.data.every((v: { capacity: number }) => v.capacity <= 100)).toBe(true);
  });

  it("supports an exact capacity range when minCapacity equals maxCapacity", async () => {
    const venues = [
      { name: "Exact 75 A", address: "A", capacity: 75, contactEmail: "exact-a@example.com" },
      { name: "Exact 75 B", address: "B", capacity: 75, contactEmail: "exact-b@example.com" },
      { name: "Exact 76", address: "C", capacity: 76, contactEmail: "exact-c@example.com" },
    ];

    for (const venue of venues) {
      expect((await request(app).post("/v1/venues").send(venue)).status).toBe(201);
    }

    const response = await request(app).get("/v1/venues?minCapacity=75&maxCapacity=75&limit=100");

    expect(response.status).toBe(200);
    expect(response.body.data.map((v: { capacity: number }) => v.capacity)).toEqual([75, 75]);
  });

  it("returns an empty result when the capacity range matches nothing", async () => {
    const response = await request(app).get("/v1/venues?minCapacity=999999&maxCapacity=1000000");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.pagination.total).toBe(0);
  });

  it("rejects invalid min/max capacity ranges", async () => {
    const response = await request(app).get("/v1/venues?minCapacity=101&maxCapacity=100");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects negative or fractional min/max capacity filters", async () => {
    expect((await request(app).get("/v1/venues?minCapacity=-1")).status).toBe(400);
    expect((await request(app).get("/v1/venues?maxCapacity=-1")).status).toBe(400);
    expect((await request(app).get("/v1/venues?minCapacity=10.5")).status).toBe(400);
    expect((await request(app).get("/v1/venues?maxCapacity=10.5")).status).toBe(400);
  });

  it("rejects duplicate names", async () => {
    const payload = {
      name: "Duplicate Venue",
      address: "Address",
      capacity: 50,
      contactEmail: "duplicate@example.com",
    };

    const first = await request(app).post("/v1/venues").send(payload);
    expect(first.status).toBe(201);

    const second = await request(app).post("/v1/venues").send({
      ...payload,
      name: "duplicate venue",
    });
    expect(second.status).toBe(409);
  });

  it("rejects invalid input", async () => {
    const response = await request(app).post("/v1/venues").send({
      name: "",
      address: "Address",
      capacity: 0,
      contactEmail: "not-an-email",
    });

    expect(response.status).toBe(400);
  });

  it("returns health and readiness", async () => {
    expect((await request(app).get("/health")).status).toBe(200);
    expect((await request(app).get("/ready")).status).toBe(200);
  });
});
