import path from "path";
import type { Request, Response } from "express";
import type { FilterQuery } from "mongoose";
import { cvDir } from "../middleware/upload";
import { Application, type IApplication } from "../models/Application";
import { CompanyProfile } from "../models/CompanyProfile";
import { Internship } from "../models/Internship";
import { StudentProfile } from "../models/StudentProfile";
import { notify } from "../services/notification.service";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { getCompanyProfileOrThrow } from "../utils/profiles";
import { buildMeta, sendSuccess } from "../utils/response";
import type { ApplicationStatus } from "../constants";

const internshipPopulate = { path: "internship", select: "title category location workMode deadline status stipend", populate: { path: "company", select: "companyName logo" } };

export const createApplication = asyncHandler(async (req: Request, res: Response) => {
  const { internshipId, coverLetter } = req.body as { internshipId: string; coverLetter?: string };
  const studentId = req.user!.id;

  const internship = await Internship.findById(internshipId);
  if (!internship || internship.status !== "PUBLISHED") throw AppError.notFound("Internship not found or no longer accepting applications");
  if (internship.deadline.getTime() < Date.now()) throw AppError.badRequest("The application deadline has passed");

  if (await Application.exists({ student: studentId, internship: internship._id })) {
    throw AppError.conflict("You have already applied to this internship");
  }

  // The unique index is the final guard against a race between two simultaneous requests (→ 409 via errorHandler)
  const application = await Application.create({
    student: studentId,
    internship: internship._id,
    company: internship.company,
    coverLetter,
    status: "PENDING",
    statusHistory: [{ status: "PENDING", changedAt: new Date() }]
  });

  const company = await CompanyProfile.findById(internship.company).select("user");
  await Promise.all([
    notify(studentId, "APPLICATION_SUBMITTED", "Application submitted", `Your application for "${internship.title}" was submitted.`, `/student/applications`),
    company ? notify(company.user, "APPLICATION_SUBMITTED", "New application received", `${req.user!.name} applied for "${internship.title}".`, `/company/applicants`) : Promise.resolve()
  ]);
  sendSuccess(res, application, "Application submitted", 201);
});

export const myApplications = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as { page: number; limit: number; status?: ApplicationStatus };
  const filter: FilterQuery<IApplication> = { student: req.user!.id, ...(q.status ? { status: q.status } : {}) };
  const [items, total] = await Promise.all([
    Application.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).populate(internshipPopulate),
    Application.countDocuments(filter)
  ]);
  sendSuccess(res, items, "OK", 200, buildMeta(total, q.page, q.limit));
});

export const receivedApplications = asyncHandler(async (req: Request, res: Response) => {
  const company = await getCompanyProfileOrThrow(req.user!.id);
  const q = req.query as unknown as { page: number; limit: number; status?: ApplicationStatus; internshipId?: string };
  const filter: FilterQuery<IApplication> = { company: company._id };
  if (q.status) filter.status = q.status;
  if (q.internshipId) filter.internship = q.internshipId;

  const [items, total] = await Promise.all([
    Application.find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate("student", "name email")
      .populate("internship", "title")
      .lean(),
    Application.countDocuments(filter)
  ]);
  const profiles = await StudentProfile.find({ user: { $in: items.map((i) => (i.student as unknown as { _id: unknown })._id) } })
    .select("user headline location technicalSkills cvOriginalName profileImage")
    .lean();
  const byUser = new Map(profiles.map((p) => [String(p.user), p]));
  const data = items.map((a) => {
    const p = byUser.get(String((a.student as unknown as { _id: unknown })._id));
    return { ...a, studentProfile: p ? { ...p, hasCv: !!p.cvOriginalName } : null };
  });
  sendSuccess(res, data, "OK", 200, buildMeta(total, q.page, q.limit));
});

/** Loads an application and enforces that the caller is the student, the owning company, or an admin. */
const loadAuthorized = async (id: string, user: NonNullable<Request["user"]>) => {
  const application = await Application.findById(id);
  if (!application) throw AppError.notFound("Application not found");
  if (user.role === "STUDENT" && String(application.student) !== user.id) throw AppError.forbidden();
  if (user.role === "COMPANY") {
    const company = await getCompanyProfileOrThrow(user.id);
    if (String(application.company) !== String(company._id)) throw AppError.forbidden();
  }
  return application;
};

export const getApplication = asyncHandler(async (req: Request, res: Response) => {
  const base = await loadAuthorized(req.params.id, req.user!);
  const application = await Application.findById(base._id).populate("student", "name email").populate(internshipPopulate);
  sendSuccess(res, application);
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body as { status: ApplicationStatus };
  const company = await getCompanyProfileOrThrow(req.user!.id);
  // Scoped lookup: another company's application simply "does not exist" for this caller
  const application = await Application.findOne({ _id: req.params.id, company: company._id }).populate("internship", "title");
  if (!application) throw AppError.notFound("Application not found");
  if (application.status === status) throw AppError.badRequest(`Application is already ${status}`);

  application.status = status;
  application.statusHistory.push({ status, changedAt: new Date() });
  await application.save();

  const title = (application.internship as unknown as { title: string }).title;
  await notify(application.student, "APPLICATION_STATUS_CHANGED", `Application ${status.toLowerCase()}`, `Your application for "${title}" is now ${status}.`, `/student/applications`);
  sendSuccess(res, application, "Application status updated");
});

export const withdrawApplication = asyncHandler(async (req: Request, res: Response) => {
  const application = await Application.findOne({ _id: req.params.id, student: req.user!.id }).populate("internship", "title");
  if (!application) throw AppError.notFound("Application not found");
  if (application.status === "ACCEPTED") throw AppError.badRequest("An accepted application cannot be withdrawn. Contact the company.");

  const title = (application.internship as unknown as { title: string } | null)?.title ?? "an internship";
  const company = await CompanyProfile.findById(application.company).select("user");
  await application.deleteOne();
  if (company) await notify(company.user, "APPLICATION_WITHDRAWN", "Application withdrawn", `${req.user!.name} withdrew their application for "${title}".`, `/company/applicants`);
  sendSuccess(res, null, "Application withdrawn");
});

export const downloadApplicantCv = asyncHandler(async (req: Request, res: Response) => {
  const application = await loadAuthorized(req.params.id, req.user!);
  const profile = await StudentProfile.findOne({ user: application.student }).select("+cvPath");
  if (!profile?.cvPath) throw AppError.notFound("This applicant has not uploaded a CV");
  res.download(path.join(cvDir, path.basename(profile.cvPath)), profile.cvOriginalName ?? "cv.pdf");
});
