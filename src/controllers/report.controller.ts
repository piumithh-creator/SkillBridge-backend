import type { Request, Response } from "express";
import { Application } from "../models/Application";
import { CVAnalysis } from "../models/CVAnalysis";
import { Internship } from "../models/Internship";
import { getAnalytics, getPlatformStats } from "../services/analytics.service";
import { ReportWriter } from "../services/pdf.service";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { getCompanyProfileOrThrow } from "../utils/profiles";

const d = (date?: Date) => (date ? new Date(date).toISOString().slice(0, 10) : "-");
const stamp = () => new Date().toISOString().slice(0, 10);

export const studentApplications = asyncHandler(async (req: Request, res: Response) => {
  const apps = await Application.find({ student: req.user!.id })
    .sort({ createdAt: -1 })
    .populate({ path: "internship", select: "title category", populate: { path: "company", select: "companyName" } });
  const r = new ReportWriter(res, `application-history-${stamp()}.pdf`, "Application History", `${req.user!.name} · ${req.user!.email}`);
  r.heading("Summary").kv("Total applications", apps.length);
  for (const s of ["PENDING", "REVIEWING", "SHORTLISTED", "ACCEPTED", "REJECTED"]) r.kv(s, apps.filter((a) => a.status === s).length);
  r.heading("Applications").table(
    [{ label: "Internship", width: 170 }, { label: "Company", width: 130 }, { label: "Applied", width: 70 }, { label: "Status", width: 80 }, { label: "Updated", width: 63 }],
    apps.map((a) => {
      const i = a.internship as unknown as { title?: string; company?: { companyName?: string } } | null;
      return [i?.title ?? "(removed)", i?.company?.companyName ?? "-", d(a.createdAt), a.status, d(a.updatedAt)];
    })
  );
  r.end();
});

export const studentCvAnalysis = asyncHandler(async (req: Request, res: Response) => {
  const a = await CVAnalysis.findOne({ student: req.user!.id }).sort({ createdAt: -1 });
  if (!a) throw AppError.notFound("No CV analysis found. Analyse your CV first.");
  const r = new ReportWriter(res, `cv-analysis-${stamp()}.pdf`, "CV Analysis Report", `${req.user!.name} · ${a.fileName} · ${d(a.createdAt)}`);
  r.heading("Overall score").kv("CV score", `${a.score} / 100`).paragraph(a.summary);
  r.heading("Technical skills").bullets(a.technicalSkills);
  r.heading("Soft skills").bullets(a.softSkills);
  r.heading("Education").bullets(a.education);
  r.heading("Experience").bullets(a.experience);
  r.heading("Missing skills").bullets(a.missingSkills);
  r.heading("Improvement suggestions").bullets(a.suggestions);
  r.heading("Formatting recommendations").bullets(a.formattingRecommendations);
  r.heading("Recommended internship categories").bullets(a.recommendedCategories);
  r.end();
});

const applicantColumns = [
  { label: "Applicant", width: 110 }, { label: "Email", width: 150 }, { label: "Internship", width: 120 },
  { label: "Applied", width: 60 }, { label: "Status", width: 63 }
];

export const companyApplicants = asyncHandler(async (req: Request, res: Response) => {
  const company = await getCompanyProfileOrThrow(req.user!.id);
  const apps = await Application.find({ company: company._id }).sort({ createdAt: -1 }).populate("student", "name email").populate("internship", "title");
  const r = new ReportWriter(res, `applicant-report-${stamp()}.pdf`, "Applicant Report", company.companyName);
  r.heading("Summary").kv("Total applicants", apps.length);
  for (const s of ["PENDING", "REVIEWING", "SHORTLISTED", "ACCEPTED", "REJECTED"]) r.kv(s, apps.filter((a) => a.status === s).length);
  r.heading("Applicants").table(applicantColumns, apps.map((a) => {
    const s = a.student as unknown as { name?: string; email?: string } | null;
    const i = a.internship as unknown as { title?: string } | null;
    return [s?.name ?? "-", s?.email ?? "-", i?.title ?? "-", d(a.createdAt), a.status];
  }));
  r.end();
});

export const companyInternship = asyncHandler(async (req: Request, res: Response) => {
  const company = await getCompanyProfileOrThrow(req.user!.id);
  const internship = await Internship.findOne({ _id: req.params.id, company: company._id });
  if (!internship) throw AppError.notFound("Internship not found");
  const apps = await Application.find({ internship: internship._id }).sort({ createdAt: -1 }).populate("student", "name email");
  const r = new ReportWriter(res, `internship-report-${stamp()}.pdf`, "Internship Application Report", `${internship.title} · ${company.companyName}`);
  r.heading("Internship").kv("Category", internship.category).kv("Location", `${internship.location} (${internship.workMode})`)
    .kv("Duration", internship.duration).kv("Vacancies", internship.vacancies).kv("Deadline", d(internship.deadline)).kv("Status", internship.status);
  r.heading("Applications").kv("Total", apps.length);
  for (const s of ["PENDING", "REVIEWING", "SHORTLISTED", "ACCEPTED", "REJECTED"]) r.kv(s, apps.filter((a) => a.status === s).length);
  r.heading("Applicants").table(
    [{ label: "Applicant", width: 140 }, { label: "Email", width: 190 }, { label: "Applied", width: 80 }, { label: "Status", width: 93 }],
    apps.map((a) => {
      const s = a.student as unknown as { name?: string; email?: string } | null;
      return [s?.name ?? "-", s?.email ?? "-", d(a.createdAt), a.status];
    })
  );
  r.end();
});

export const adminPlatform = asyncHandler(async (_req: Request, res: Response) => {
  const [stats, analytics] = await Promise.all([getPlatformStats(), getAnalytics()]);
  const r = new ReportWriter(res, `platform-report-${stamp()}.pdf`, "Platform Statistics Report");
  r.heading("Users").kv("Total", stats.users.total).kv("Students", stats.users.students).kv("Companies", stats.users.companies).kv("Admins", stats.users.admins).kv("Blocked", stats.users.blocked);
  r.heading("Internships").kv("Total", stats.internships.total).kv("Published", stats.internships.PUBLISHED).kv("Draft", stats.internships.DRAFT).kv("Closed", stats.internships.CLOSED).kv("Removed", stats.internships.REMOVED);
  r.heading("Applications").kv("Total", stats.applications.total);
  Object.entries(stats.applications.byStatus).forEach(([k, v]) => r.kv(k, v));
  r.heading("Published internships by category").table([{ label: "Category", width: 330 }, { label: "Count", width: 183 }], analytics.internshipsByCategory.map((c) => [c.name, String(c.value)]));
  r.heading("Most requested skills").table([{ label: "Skill", width: 330 }, { label: "Internships", width: 183 }], analytics.topSkills.map((c) => [c.name, String(c.value)]));
  r.heading("Most applied internships").table([{ label: "Internship", width: 330 }, { label: "Applications", width: 183 }], analytics.topInternships.map((c) => [c.name, String(c.value)]));
  r.end();
});
