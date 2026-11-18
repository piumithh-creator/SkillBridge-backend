import { describe, expect, it } from "vitest";
import { api, auth, internshipPayload, registerUser } from "./helpers";

describe("Internship CRUD", () => {
  it("lets a company create, read, update and delete its internship", async () => {
    const { token } = await registerUser("COMPANY", "c1@test.com");
    const created = await api().post("/api/internships").set(auth(token)).send(internshipPayload());
    expect(created.status).toBe(201);
    const id = created.body.data._id;

    const read = await api().get(`/api/internships/${id}`);
    expect(read.status).toBe(200);
    expect(read.body.data.title).toBe("Frontend Intern");
    expect(read.body.data.company.user).toBeUndefined();

    const updated = await api().put(`/api/internships/${id}`).set(auth(token)).send({ title: "Senior Frontend Intern" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.title).toBe("Senior Frontend Intern");

    expect((await api().delete(`/api/internships/${id}`).set(auth(token))).status).toBe(200);
    expect((await api().get(`/api/internships/${id}`)).status).toBe(404);
  });

  it("validates input (past deadline, bad category)", async () => {
    const { token } = await registerUser("COMPANY", "c2@test.com");
    const past = await api().post("/api/internships").set(auth(token)).send(internshipPayload({ deadline: new Date(Date.now() - 86400000).toISOString() }));
    expect(past.status).toBe(400);
    const cat = await api().post("/api/internships").set(auth(token)).send(internshipPayload({ category: "Nope" }));
    expect(cat.status).toBe(400);
  });

  it("forbids students from creating internships", async () => {
    const { token } = await registerUser("STUDENT", "s1@test.com");
    expect((await api().post("/api/internships").set(auth(token)).send(internshipPayload())).status).toBe(403);
  });

  it("enforces ownership – another company cannot edit or delete", async () => {
    const a = await registerUser("COMPANY", "a@test.com");
    const b = await registerUser("COMPANY", "b@test.com");
    const created = await api().post("/api/internships").set(auth(a.token)).send(internshipPayload());
    const id = created.body.data._id;
    expect((await api().put(`/api/internships/${id}`).set(auth(b.token)).send({ title: "Hijacked" })).status).toBe(404);
    expect((await api().delete(`/api/internships/${id}`).set(auth(b.token))).status).toBe(404);
  });

  it("supports search, filter, sort and pagination", async () => {
    const { token } = await registerUser("COMPANY", "c3@test.com");
    await api().post("/api/internships").set(auth(token)).send(internshipPayload({ title: "React Intern", workMode: "REMOTE" }));
    await api().post("/api/internships").set(auth(token)).send(internshipPayload({ title: "Data Intern", description: "Analyse datasets and build dashboards with our analytics team.", category: "Data Science & AI", requiredSkills: ["Python"] }));

    const search = await api().get("/api/internships?search=react");
    expect(search.body.data).toHaveLength(1);
    const filter = await api().get("/api/internships?category=Data%20Science%20%26%20AI");
    expect(filter.body.data[0].title).toBe("Data Intern");
    const remote = await api().get("/api/internships?workMode=REMOTE");
    expect(remote.body.data).toHaveLength(1);
    const page = await api().get("/api/internships?limit=1&page=2");
    expect(page.body.meta).toMatchObject({ total: 2, page: 2, limit: 1, totalPages: 2 });
  });

  it("hides draft internships from the public", async () => {
    const { token } = await registerUser("COMPANY", "c4@test.com");
    const created = await api().post("/api/internships").set(auth(token)).send(internshipPayload({ status: "DRAFT" }));
    const id = created.body.data._id;
    expect((await api().get(`/api/internships/${id}`)).status).toBe(404);
    expect((await api().get(`/api/internships/${id}`).set(auth(token))).status).toBe(200);
    expect((await api().get("/api/internships")).body.data).toHaveLength(0);
  });
});
