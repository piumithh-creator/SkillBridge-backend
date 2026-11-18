import { describe, expect, it } from "vitest";
import { api, auth, createAdminToken, registerUser } from "./helpers";

describe("Authentication", () => {
  it("registers a student and returns an access token + refresh cookie", async () => {
    const { res } = await registerUser("STUDENT", "stu@test.com");
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("STUDENT");
    expect(res.body.data.user.password).toBeUndefined();
    expect(String(res.headers["set-cookie"])).toContain("HttpOnly");
  });

  it("rejects duplicate email", async () => {
    await registerUser("STUDENT", "dup@test.com");
    const { res } = await registerUser("STUDENT", "dup@test.com");
    expect(res.status).toBe(409);
  });

  it("never allows ADMIN registration", async () => {
    const res = await api().post("/api/auth/register").send({ name: "Evil", email: "evil@test.com", password: "Passw0rd123", role: "ADMIN" });
    expect(res.status).toBe(400);
  });

  it("rejects weak passwords", async () => {
    const res = await api().post("/api/auth/register").send({ name: "Weak", email: "weak@test.com", password: "short", role: "STUDENT" });
    expect(res.status).toBe(400);
  });

  it("logs in with valid credentials and rejects invalid ones", async () => {
    await registerUser("COMPANY", "co@test.com");
    const ok = await api().post("/api/auth/login").send({ email: "co@test.com", password: "Passw0rd123" });
    expect(ok.status).toBe(200);
    const bad = await api().post("/api/auth/login").send({ email: "co@test.com", password: "wrongpass1" });
    expect(bad.status).toBe(401);
  });

  it("protects /me with JWT", async () => {
    const { token } = await registerUser("STUDENT", "me@test.com");
    expect((await api().get("/api/auth/me")).status).toBe(401);
    expect((await api().get("/api/auth/me").set(auth("garbage"))).status).toBe(401);
    const res = await api().get("/api/auth/me").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("me@test.com");
  });

  it("rotates refresh tokens and detects reuse", async () => {
    const { cookies } = await registerUser("STUDENT", "rot@test.com");
    const first = await api().post("/api/auth/refresh").set("Cookie", cookies);
    expect(first.status).toBe(200);
    const reuse = await api().post("/api/auth/refresh").set("Cookie", cookies); // old token replayed
    expect(reuse.status).toBe(401);
  });

  it("blocks users via admin and denies their login", async () => {
    const { res } = await registerUser("STUDENT", "blk@test.com");
    const admin = await createAdminToken();
    const patch = await api().patch(`/api/admin/users/${res.body.data.user.id}/status`).set(auth(admin)).send({ isBlocked: true });
    expect(patch.status).toBe(200);
    const login = await api().post("/api/auth/login").send({ email: "blk@test.com", password: "Passw0rd123" });
    expect(login.status).toBe(403);
  });
});

describe("Role-based authorization", () => {
  it("forbids students from company and admin routes", async () => {
    const { token } = await registerUser("STUDENT", "s@test.com");
    expect((await api().get("/api/companies/profile").set(auth(token))).status).toBe(403);
    expect((await api().get("/api/admin/dashboard").set(auth(token))).status).toBe(403);
  });

  it("forbids companies from student routes", async () => {
    const { token } = await registerUser("COMPANY", "c@test.com");
    expect((await api().get("/api/students/profile").set(auth(token))).status).toBe(403);
  });

  it("allows admin dashboard for admins", async () => {
    const admin = await createAdminToken();
    const res = await api().get("/api/admin/dashboard").set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.data.users.admins).toBe(1);
  });
});
