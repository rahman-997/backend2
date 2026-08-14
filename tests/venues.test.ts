import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";

const venue = {
  name: "Main Hall",
  address: "1 Example Street",
  capacity: 500,
  contactEmail: "contact@example.com",
};

describe("/v1/venues", () => {
  beforeEach(() => {
    // The store is intentionally process-local. Reloading the test module is
    // not required because every test uses unique venue names/ids.
  });

  it("creates a venue", async () => {
    const response = await request(app).post("/v1/venues").send(venue);

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject(venue);
    expect(response.body.data.id).toEqual(expect.any(String));
    expect(response.body.data.createdAt).toEqual(expect.any(String));
  });

  it("lists venues with a limit", async () => {
    const suffix = crypto.randomUUID();
    await request(app).post("/v1/venues").send({ ...venue, name: `A-${suffix}` });
    await request(app).post("/v1/venues").send({ ...venue, name: `B-${suffix}` });

    const response = await request(app).get("/v1/venues?limit=1");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  it("gets a venue by id", async () => {
    const created = await request(app).post("/v1/venues").send({
      ...venue,
      name: `Get-${crypto.randomUUID()}`,
    });

    const response = await request(app).get(`/v1/venues/${created.body.data.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(created.body.data.id);
  });

  it("returns 404 for an unknown id", async () => {
    const response = await request(app).get(`/v1/venues/${crypto.randomUUID()}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("partially updates a venue", async () => {
    const created = await request(app).post("/v1/venues").send({
      ...venue,
      name: `Patch-${crypto.randomUUID()}`,
    });

    const response = await request(app)
      .patch(`/v1/venues/${created.body.data.id}`)
      .send({ capacity: 750 });

    expect(response.status).toBe(200);
    expect(response.body.data.capacity).toBe(750);
    expect(response.body.data.address).toBe(venue.address);
  });

  it("deletes a venue", async () => {
    const created = await request(app).post("/v1/venues").send({
      ...venue,
      name: `Delete-${crypto.randomUUID()}`,
    });

    const deleted = await request(app).delete(`/v1/venues/${created.body.data.id}`);
    expect(deleted.status).toBe(204);

    const fetched = await request(app).get(`/v1/venues/${created.body.data.id}`);
    expect(fetched.status).toBe(404);
  });

  it("rejects duplicate names with 409", async () => {
    const name = `Duplicate-${crypto.randomUUID()}`;
    await request(app).post("/v1/venues").send({ ...venue, name });

    const response = await request(app).post("/v1/venues").send({ ...venue, name });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("rejects invalid venue input", async () => {
    const response = await request(app).post("/v1/venues").send({
      ...venue,
      capacity: 0,
      contactEmail: "not-an-email",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an empty patch", async () => {
    const created = await request(app).post("/v1/venues").send({
      ...venue,
      name: `EmptyPatch-${crypto.randomUUID()}`,
    });

    const response = await request(app)
      .patch(`/v1/venues/${created.body.data.id}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("validates the limit query", async () => {
    const response = await request(app).get("/v1/venues?limit=0");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
