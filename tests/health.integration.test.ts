import request from "supertest";
import app from "../src/app.js";

describe("health endpoints", () => {
  it("reports liveness", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "ok" });
  });

  it("returns a request id", async () => {
    const response = await request(app).get("/health");
    expect(response.headers["x-request-id"]).toBeTruthy();
  });
});
