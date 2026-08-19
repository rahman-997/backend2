import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../app.js";
import { authRepository } from "./auth.repository.js";

function credentials(label = "Auth Test User") {
  const suffix = randomUUID();
  return {
    name: label,
    email: `auth-${suffix}@example.com`,
    password: `Strong-password-${suffix}`,
  };
}

describe("/v1/auth", () => {
  it("registers a user and returns safe user data plus tokens", async () => {
    const response = await request(app).post("/v1/auth/register").send(credentials());
    expect(response.status).toBe(201);
    expect(response.body.data.user).toEqual(expect.objectContaining({ role: "USER", isActive: true }));
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.user.tokenVersion).toBeUndefined();
    expect(response.body.data.tokens.accessToken).toEqual(expect.any(String));
    expect(response.body.data.tokens.refreshToken).toEqual(expect.any(String));
    expect(response.body.data.tokens.tokenType).toBe("Bearer");
  });

  it("rejects duplicate emails case-insensitively and weak passwords", async () => {
    const input = credentials();
    expect((await request(app).post("/v1/auth/register").send(input)).status).toBe(201);
    expect((await request(app).post("/v1/auth/register").send({ ...input, email: input.email.toUpperCase() })).status).toBe(409);
    expect((await request(app).post("/v1/auth/register").send({ ...credentials(), password: "short" })).status).toBe(400);
  });

  it("logs in and reads the authenticated profile", async () => {
    const input = credentials();
    await request(app).post("/v1/auth/register").send(input);
    const login = await request(app).post("/v1/auth/login").send({ email: input.email, password: input.password });
    expect(login.status).toBe(200);
    const me = await request(app).get("/v1/auth/me").set("Authorization", `Bearer ${login.body.data.tokens.accessToken}`);
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
    expect((await request(app).post("/v1/auth/refresh").send({ refreshToken: original })).status).toBe(401);
  });

  it("revokes refresh tokens on logout and all tokens on logout-all", async () => {
    const registered = await request(app).post("/v1/auth/register").send(credentials());
    const accessToken = registered.body.data.tokens.accessToken as string;
    const refreshToken = registered.body.data.tokens.refreshToken as string;

    expect((await request(app).post("/v1/auth/logout").send({ refreshToken })).status).toBe(204);
    expect((await request(app).post("/v1/auth/refresh").send({ refreshToken })).status).toBe(401);

    expect((await request(app).post("/v1/auth/logout-all").set("Authorization", `Bearer ${accessToken}`)).status).toBe(204);
    expect((await request(app).get("/v1/auth/me").set("Authorization", `Bearer ${accessToken}`)).status).toBe(401);
  });

  it("requires ADMIN and supports role/status changes with immediate token invalidation", async () => {
    expect((await request(app).get("/v1/auth/admin/users")).status).toBe(401);

    const adminInput = credentials("Admin Test");
    const adminRegistered = await request(app).post("/v1/auth/register").send(adminInput);
    const adminId = adminRegistered.body.data.user.id as string;
    await authRepository.updateUserRole(adminId, "ADMIN");
    const adminLogin = await request(app).post("/v1/auth/login").send({ email: adminInput.email, password: adminInput.password });
    const adminToken = adminLogin.body.data.tokens.accessToken as string;

    const targetInput = credentials("Target User");
    const target = await request(app).post("/v1/auth/register").send(targetInput);
    const targetId = target.body.data.user.id as string;
    const staleTargetToken = target.body.data.tokens.accessToken as string;

    const promoted = await request(app)
      .patch(`/v1/auth/admin/users/${targetId}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "ADMIN" });
    expect(promoted.status).toBe(200);
    expect(promoted.body.data.role).toBe("ADMIN");
    expect((await request(app).get("/v1/auth/me").set("Authorization", `Bearer ${staleTargetToken}`)).status).toBe(401);

    const targetLogin = await request(app).post("/v1/auth/login").send({ email: targetInput.email, password: targetInput.password });
    const freshTargetToken = targetLogin.body.data.tokens.accessToken as string;
    const disabled = await request(app)
      .patch(`/v1/auth/admin/users/${targetId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(disabled.status).toBe(200);
    expect(disabled.body.data.isActive).toBe(false);
    expect((await request(app).get("/v1/auth/me").set("Authorization", `Bearer ${freshTargetToken}`)).status).toBe(401);
    expect((await request(app).post("/v1/auth/login").send({ email: targetInput.email, password: targetInput.password })).status).toBe(403);

    const users = await request(app).get("/v1/auth/admin/users").set("Authorization", `Bearer ${adminToken}`);
    expect(users.status).toBe(200);
    expect(users.body.data.some((user: { id: string }) => user.id === targetId)).toBe(true);

    const audit = await request(app).get("/v1/admin/audit-logs?limit=100").set("Authorization", `Bearer ${adminToken}`);
    expect(audit.status).toBe(200);
    expect(audit.body.data.some((log: { resourceId: string; action: string }) => log.resourceId === targetId && log.action === "admin.user_disabled")).toBe(true);
  });
});
