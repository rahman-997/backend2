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
