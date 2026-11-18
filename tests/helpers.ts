import bcrypt from "bcryptjs";
import request from "supertest";
import app from "../src/app";
import { User } from "../src/models/User";

export const api = () => request(app);

export const registerUser = async (role: "STUDENT" | "COMPANY", email: string, extra: Record<string, unknown> = {}) => {
  const res = await api()
    .post("/api/auth/register")
    .send({ name: "Test User", email, password: "Passw0rd123", role, ...(role === "COMPANY" ? { companyName: "Acme Ltd" } : {}), ...extra });
  return { res, token: res.body?.data?.accessToken as string, cookies: res.headers["set-cookie"] as unknown as string[] };
};

export const createAdminToken = async (email = "admin@skillbridge.test") => {
  await User.create({ name: "Admin", email, password: await bcrypt.hash("Passw0rd123", 10), role: "ADMIN" });
  const res = await api().post("/api/auth/login").send({ email, password: "Passw0rd123" });
  return res.body.data.accessToken as string;
};

export const internshipPayload = (overrides: Record<string, unknown> = {}) => ({
  title: "Frontend Intern",
  description: "Work with our React team on production features for six months.",
  category: "Software Engineering",
  requiredSkills: ["React", "TypeScript"],
  qualifications: "Pursuing a degree in IT",
  location: "Colombo",
  workMode: "HYBRID",
  duration: "6 months",
  stipend: 50000,
  deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
  vacancies: 2,
  requirements: "Good communication",
  ...overrides
});

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
