import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("error contract", () => {
  it("returns a structured 404 with request id", async () => {
    const response = await request(app).get("/v1/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.headers["x-request-id"]).toBeTruthy();
    expect(response.body.error).toBeDefined();
    expect(response.body.error.requestId).toBe(response.headers["x-request-id"]);
  });
});
