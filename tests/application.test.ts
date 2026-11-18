import { describe, expect, it } from "vitest";
import { api, auth, internshipPayload, registerUser } from "./helpers";

const setup = async () => {
  const company = await registerUser("COMPANY", "company@test.com");
  const student = await registerUser("STUDENT", "student@test.com");
  const created = await api().post("/api/internships").set(auth(company.token)).send(internshipPayload());
  return { company, student, internshipId: created.body.data._id as string };
};

describe("Applications", () => {
  it("submits an application and notifies both parties", async () => {
    const { company, student, internshipId } = await setup();
    const res = await api().post("/api/applications").set(auth(student.token)).send({ internshipId, coverLetter: "Hello" });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("PENDING");

    const sn = await api().get("/api/notifications").set(auth(student.token));
    expect(sn.body.meta.unreadCount).toBeGreaterThan(0);
    const cn = await api().get("/api/notifications").set(auth(company.token));
    expect(cn.body.data.some((n: { type: string }) => n.type === "APPLICATION_SUBMITTED")).toBe(true);
  });

  it("prevents duplicate applications", async () => {
    const { student, internshipId } = await setup();
    await api().post("/api/applications").set(auth(student.token)).send({ internshipId });
    const dup = await api().post("/api/applications").set(auth(student.token)).send({ internshipId });
    expect(dup.status).toBe(409);
  });

  it("prevents duplicates even under concurrent requests", async () => {
    const { student, internshipId } = await setup();
    const results = await Promise.all([1, 2, 3].map(() => api().post("/api/applications").set(auth(student.token)).send({ internshipId })));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
  });

  it("rejects applications after the deadline or for closed internships", async () => {
    const { company, student, internshipId } = await setup();
    await api().put(`/api/internships/${internshipId}`).set(auth(company.token)).send({ status: "CLOSED" });
    const res = await api().post("/api/applications").set(auth(student.token)).send({ internshipId });
    expect(res.status).toBe(404);
  });

  it("only students can apply", async () => {
    const { company, internshipId } = await setup();
    expect((await api().post("/api/applications").set(auth(company.token)).send({ internshipId })).status).toBe(403);
  });

  it("lets the owning company change status and notifies the student", async () => {
    const { company, student, internshipId } = await setup();
    const app = await api().post("/api/applications").set(auth(student.token)).send({ internshipId });
    const id = app.body.data._id;

    const upd = await api().patch(`/api/applications/${id}/status`).set(auth(company.token)).send({ status: "SHORTLISTED" });
    expect(upd.status).toBe(200);
    expect(upd.body.data.status).toBe("SHORTLISTED");

    const mine = await api().get("/api/applications/my").set(auth(student.token));
    expect(mine.body.data[0].status).toBe("SHORTLISTED");
    const notes = await api().get("/api/notifications").set(auth(student.token));
    expect(notes.body.data.some((n: { type: string }) => n.type === "APPLICATION_STATUS_CHANGED")).toBe(true);

    expect((await api().patch(`/api/applications/${id}/status`).set(auth(company.token)).send({ status: "BOGUS" })).status).toBe(400);
  });

  it("blocks other companies and students from changing status", async () => {
    const { student, internshipId } = await setup();
    const other = await registerUser("COMPANY", "other@test.com");
    const app = await api().post("/api/applications").set(auth(student.token)).send({ internshipId });
    const id = app.body.data._id;
    expect((await api().patch(`/api/applications/${id}/status`).set(auth(other.token)).send({ status: "ACCEPTED" })).status).toBe(404);
    expect((await api().patch(`/api/applications/${id}/status`).set(auth(student.token)).send({ status: "ACCEPTED" })).status).toBe(403);
    expect((await api().get(`/api/applications/${id}`).set(auth(other.token))).status).toBe(403);
  });

  it("lets a student withdraw only their own application", async () => {
    const { student, internshipId } = await setup();
    const other = await registerUser("STUDENT", "other-student@test.com");
    const app = await api().post("/api/applications").set(auth(student.token)).send({ internshipId });
    const id = app.body.data._id;
    expect((await api().delete(`/api/applications/${id}`).set(auth(other.token))).status).toBe(404);
    expect((await api().delete(`/api/applications/${id}`).set(auth(student.token))).status).toBe(200);
    expect((await api().get("/api/applications/my").set(auth(student.token))).body.data).toHaveLength(0);
  });

  it("marks notifications read individually and in bulk", async () => {
    const { student, internshipId } = await setup();
    await api().post("/api/applications").set(auth(student.token)).send({ internshipId });
    const list = await api().get("/api/notifications").set(auth(student.token));
    const nid = list.body.data[0]._id;
    expect((await api().patch(`/api/notifications/${nid}/read`).set(auth(student.token))).status).toBe(200);
    expect((await api().patch("/api/notifications/read-all").set(auth(student.token))).status).toBe(200);
    expect((await api().get("/api/notifications/unread-count").set(auth(student.token))).body.data.unreadCount).toBe(0);
  });
});
