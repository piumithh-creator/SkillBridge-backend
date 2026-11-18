import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { StudentProfile } from "../src/models/StudentProfile";
import { AppError } from "../src/utils/AppError";
import { api, auth, internshipPayload, registerUser } from "./helpers";

// The AI + PDF layers are mocked so these tests never call Gemini (no API key / network needed).
vi.mock("../src/services/gemini.service", () => ({
  analyzeCvText: vi.fn(),
  matchCvToInternship: vi.fn()
}));
vi.mock("../src/services/cv.service", () => ({
  extractPdfText: vi.fn()
}));

import { extractPdfText } from "../src/services/cv.service";
import { analyzeCvText, matchCvToInternship } from "../src/services/gemini.service";

const analysis = {
  score: 78,
  summary: "Solid junior CV.",
  technicalSkills: ["React", "TypeScript"],
  softSkills: ["Teamwork"],
  education: ["BSc IT"],
  experience: ["Intern at Acme"],
  missingSkills: ["Docker"],
  suggestions: ["Add measurable results"],
  formattingRecommendations: ["Use one page"],
  recommendedCategories: ["Software Engineering"]
};
const match = {
  matchPercentage: 64,
  matchingSkills: ["React"],
  missingSkills: ["TypeScript"],
  suggestions: ["Show a TypeScript project"],
  summary: "Good partial match."
};

const pdf = (text = "%PDF-1.4 fake pdf body") => Buffer.from(text);

beforeEach(() => {
  vi.mocked(extractPdfText).mockReset().mockResolvedValue("Jane Doe CV. React TypeScript developer. ".repeat(10));
  vi.mocked(analyzeCvText).mockReset().mockResolvedValue({ data: analysis, model: "test-model" });
  vi.mocked(matchCvToInternship).mockReset().mockResolvedValue(match);
});

describe("AI – access control", () => {
  it("requires authentication", async () => {
    expect((await api().get("/api/ai/analyses/latest")).status).toBe(401);
    expect((await api().post("/api/ai/analyze-cv")).status).toBe(401);
  });

  it("is for students only", async () => {
    const { token } = await registerUser("COMPANY", "co@test.com");
    expect((await api().get("/api/ai/analyses").set(auth(token))).status).toBe(403);
    expect((await api().post("/api/ai/analyze-cv").set(auth(token))).status).toBe(403);
  });
});

describe("AI – CV analysis", () => {
  it("analyses an uploaded PDF, stores it and hides the extracted text", async () => {
    const { token } = await registerUser("STUDENT", "s1@test.com");
    const res = await api().post("/api/ai/analyze-cv").set(auth(token)).attach("cv", pdf(), { filename: "my-cv.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ score: 78, fileName: "my-cv.pdf", aiModel: "test-model" });
    expect(res.body.data.extractedText).toBeUndefined();
    expect(analyzeCvText).toHaveBeenCalledTimes(1);

    const latest = await api().get("/api/ai/analyses/latest").set(auth(token));
    expect(latest.body.data.score).toBe(78);
    expect(latest.body.data.extractedText).toBeUndefined();
    const list = await api().get("/api/ai/analyses").set(auth(token));
    expect(list.body.data).toHaveLength(1);
  });

  it("rejects a file that is not really a PDF (spoofed mimetype)", async () => {
    const { token } = await registerUser("STUDENT", "s2@test.com");
    const res = await api().post("/api/ai/analyze-cv").set(auth(token)).attach("cv", Buffer.from("just some text"), { filename: "fake.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(400);
    expect(analyzeCvText).not.toHaveBeenCalled();
  });

  it("asks the student to upload a CV when none is attached or saved", async () => {
    const { token } = await registerUser("STUDENT", "s3@test.com");
    const res = await api().post("/api/ai/analyze-cv").set(auth(token));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/upload a cv/i);
  });

  it("returns a friendly 400 (not 500) when the saved profile CV file is missing on disk", async () => {
    const { token, res } = await registerUser("STUDENT", "s4@test.com");
    await StudentProfile.updateOne({ user: new mongoose.Types.ObjectId(res.body.data.user.id) }, { cvPath: "does-not-exist.pdf", cvOriginalName: "old.pdf" });
    const out = await api().post("/api/ai/analyze-cv").set(auth(token));
    expect(out.status).toBe(400);
    expect(out.body.message).toMatch(/upload your cv again/i);
  });

  it("passes through AI service errors (e.g. missing API key → 503)", async () => {
    vi.mocked(analyzeCvText).mockRejectedValueOnce(new AppError(503, "AI service is not configured. Set GEMINI_API_KEY on the server."));
    const { token } = await registerUser("STUDENT", "s5@test.com");
    const res = await api().post("/api/ai/analyze-cv").set(auth(token)).attach("cv", pdf(), { filename: "cv.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/not configured/i);
  });
});

describe("AI – internship matching", () => {
  const publishInternship = async () => {
    const company = await registerUser("COMPANY", "company@test.com");
    const created = await api().post("/api/internships").set(auth(company.token)).send(internshipPayload());
    return created.body.data._id as string;
  };

  it("requires an analysed CV first", async () => {
    const id = await publishInternship();
    const { token } = await registerUser("STUDENT", "m1@test.com");
    const res = await api().post("/api/ai/match-internship").set(auth(token)).send({ internshipId: id });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/analyse your cv first/i);
  });

  it("matches the latest analysed CV with a published internship", async () => {
    const id = await publishInternship();
    const { token } = await registerUser("STUDENT", "m2@test.com");
    await api().post("/api/ai/analyze-cv").set(auth(token)).attach("cv", pdf(), { filename: "cv.pdf", contentType: "application/pdf" });

    const res = await api().post("/api/ai/match-internship").set(auth(token)).send({ internshipId: id });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ internshipId: id, internshipTitle: "Frontend Intern", matchPercentage: 64 });
    expect(matchCvToInternship).toHaveBeenCalledTimes(1);
  });

  it("validates the id and returns 404 for unknown internships", async () => {
    const { token } = await registerUser("STUDENT", "m3@test.com");
    expect((await api().post("/api/ai/match-internship").set(auth(token)).send({ internshipId: "nope" })).status).toBe(400);
    const unknown = new mongoose.Types.ObjectId().toString();
    expect((await api().post("/api/ai/match-internship").set(auth(token)).send({ internshipId: unknown })).status).toBe(404);
  });
});
