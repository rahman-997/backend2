import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../app.js";

function credentials() {
  const suffix = randomUUID();
  return {
    name: "Auth Test User",
    email: `auth-${suffix}@example.com`,
    password: `Strong-password-${suffix}`,
  };
}

describe("/v1/auth", () => {
  it("registers a user and returns access and refresh tokens", async () => {
    const response = await request(app).post("/v1/auth/register").send(credentials());

    expect(response.status).toBe(201);
    expect(response.body.data.user).toEqual(expect.objectContaining({ role: "USER" }));
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.tokens.accessToken).toEqual(expect.any(String));
    expect(response.body.data.tokens.refreshToken).toEqual(expect.any(String));
    expect(response.body.data.tokens.tokenType).toBe("Bearer");
  });

  it("rejects duplicate emails case-insensitively", async () => {
    const input = credentials();
    expect((await request(app).post("/v1/auth/register").send(input)).status).toBe(201);

    const duplicate = await request(app).post("/v1/auth/register").send({
      ...input,
      email: input.email.toUpperCase(),
    });
    expect(duplicate.status).toBe(409);
  });

  it("rejects weak passwords", async () => {
    const input = credentials();
    const response = await request(app).post("/v1/auth/register").send({ ...input, password: "short" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("logs in and reads the authenticated profile", async () => {
    const input = credentials();
    await request(app).post("/v1/auth/register").send(input);

    const login = await request(app).post("/v1/auth/login").send({ email: input.email, password: input.password });
    expect(login.status).toBe(200);

    const me = await request(app)
      .get("/v1/auth/me")
      .set("Authorization", `Bearer ${login.body.data.tokens.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(input.email.toLowerCase());
  });

  it("rejects invalid credentials without revealing account existence", async () => {
    const response = await request(app).post("/v1/auth/login").send({
      email: `missing-${randomUUID()}@example.com`,
      password: "this-is-not-the-right-password",
    });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rotates refresh tokens and rejects reuse", async () => {
    const registered = await request(app).post("/v1/auth/register").send(credentials());
    const original = registered.body.data.tokens.refreshToken as string;

    const rotated = await request(app).post("/v1/auth/refresh").send({ refreshToken: original });
    expect(rotated.status).toBe(200);
    expect(rotated.body.data.tokens.refreshToken).not.toBe(original);

    const reused = await request(app).post("/v1/auth/refresh").send({ refreshToken: original });
    expect(reused.status).toBe(401);
  });

  it("revokes refresh tokens on logout", async () => {
    const registered = await request(app).post("/v1/auth/register").send(credentials());
    const refreshToken = registered.body.data.tokens.refreshToken as string;

    expect((await request(app).post("/v1/auth/logout").send({ refreshToken })).status).toBe(204);
    expect((await request(app).post("/v1/auth/refresh").send({ refreshToken })).status).toBe(401);
  });

  it("requires authentication and an ADMIN role for the user list", async () => {
    expect((await request(app).get("/v1/auth/admin/users")).status).toBe(401);

    const registered = await request(app).post("/v1/auth/register").send(credentials());
    const accessToken = registered.body.data.tokens.accessToken as string;

    const forbidden = await request(app)
      .get("/v1/auth/admin/users")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe("FORBIDDEN");
  });
});
