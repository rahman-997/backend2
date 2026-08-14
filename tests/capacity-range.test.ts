import request from "supertest";
import app from "../src/app.js";

describe("venue capacity ranges", () => {
  it("accepts an inclusive min/max range", async () => {
    const response = await request(app)
      .get("/v1/venues?minCapacity=500&maxCapacity=1000");

    expect(response.status).toBe(200);
    expect(response.body.data.every((venue: { capacity: number }) => venue.capacity >= 500 && venue.capacity <= 1000)).toBe(true);
  });

  it("accepts an exact capacity range", async () => {
    const response = await request(app)
      .get("/v1/venues?minCapacity=750&maxCapacity=750");

    expect(response.status).toBe(200);
    expect(response.body.data.every((venue: { capacity: number }) => venue.capacity === 750)).toBe(true);
  });

  it("rejects an inverted range", async () => {
    const response = await request(app)
      .get("/v1/venues?minCapacity=1000&maxCapacity=500");

    expect(response.status).toBe(400);
  });
});
