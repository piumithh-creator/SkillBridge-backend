import type { Request, Response } from "express";
import type { FilterQuery } from "mongoose";
import { Application } from "../models/Application";
import { Internship, type IInternship } from "../models/Internship";
import { SavedInternship } from "../models/SavedInternship";
import { StudentProfile } from "../models/StudentProfile";
import { notify, notifyMany } from "../services/notification.service";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { getCompanyProfileOrThrow } from "../utils/profiles";
import { escapeRegex } from "../utils/pagination";
import { buildMeta, sendSuccess } from "../utils/response";

const COMPANY_FIELDS = "companyName logo location industry website";

interface ListQuery {
  page: number; limit: number; search?: string; category?: string; workMode?: string;
  location?: string; minStipend?: number; skills?: string; sort: "newest" | "deadline" | "stipend";
}

/** Tells students whose skills overlap the internship that a relevant opportunity is live. */
const announceInternship = async (internship: IInternship, companyName: string, companyUserId: string) => {
  const link = `/student/internships/${internship.id}`;
  await notify(companyUserId, "INTERNSHIP_PUBLISHED", "Internship published", `"${internship.title}" is now live.`, `/company/internships`);
  if (!internship.requiredSkills.length) return;
  const rx = internship.requiredSkills.map((s) => new RegExp(`^${escapeRegex(s)}$`, "i"));
  const matches = await StudentProfile.find({ technicalSkills: { $in: rx } }).select("user").limit(200);
  await notifyMany(
    matches.map((m) => m.user),
    "INTERNSHIP_PUBLISHED",
    "New internship matching your skills",
    `${companyName} posted "${internship.title}".`,
    link
  );
};

export const listInternships = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as ListQuery;
  const filter: FilterQuery<IInternship> = { status: "PUBLISHED", deadline: { $gte: new Date() } };

  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), "i");
    filter.$or = [{ title: rx }, { description: rx }, { requiredSkills: rx }];
  }
  if (q.category) filter.category = q.category;
  if (q.workMode) filter.workMode = q.workMode;
  if (q.location) filter.location = new RegExp(escapeRegex(q.location), "i");
  if (q.minStipend !== undefined) filter.stipend = { $gte: q.minStipend };
  if (q.skills) {
    const list = q.skills.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length) filter.requiredSkills = { $in: list.map((s) => new RegExp(`^${escapeRegex(s)}$`, "i")) };
  }

  const sort: Record<string, 1 | -1> = q.sort === "deadline" ? { deadline: 1 } : q.sort === "stipend" ? { stipend: -1 } : { createdAt: -1 };

  const [items, total] = await Promise.all([
    Internship.find(filter).sort(sort).skip((q.page - 1) * q.limit).limit(q.limit).populate("company", COMPANY_FIELDS),
    Internship.countDocuments(filter)
  ]);
  sendSuccess(res, items, "OK", 200, buildMeta(total, q.page, q.limit));
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const company = await getCompanyProfileOrThrow(req.user!.id);
  const q = req.query as unknown as { page: number; limit: number; status?: string; search?: string };
  const filter: FilterQuery<IInternship> = { company: company._id, ...(q.status ? { status: q.status } : { status: { $ne: "REMOVED" } }) };
  if (q.search) filter.title = new RegExp(escapeRegex(q.search), "i");

  const [items, total] = await Promise.all([
    Internship.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Internship.countDocuments(filter)
  ]);
  const counts = await Application.aggregate<{ _id: unknown; count: number }>([
    { $match: { internship: { $in: items.map((i) => i._id) } } },
    { $group: { _id: "$internship", count: { $sum: 1 } } }
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.count]));
  sendSuccess(res, items.map((i) => ({ ...i, applicationCount: map.get(String(i._id)) ?? 0 })), "OK", 200, buildMeta(total, q.page, q.limit));
});

export const getInternship = asyncHandler(async (req: Request, res: Response) => {
  const internship = await Internship.findById(req.params.id).populate("company", `${COMPANY_FIELDS} description user`);
  if (!internship) throw AppError.notFound("Internship not found");

  const user = req.user;
  const companyDoc = internship.company as unknown as { user?: unknown };
  const isOwner = user?.role === "COMPANY" && String(companyDoc.user) === user.id;
  const isAdmin = user?.role === "ADMIN";
  if (internship.status !== "PUBLISHED" && !isOwner && !isAdmin) throw AppError.notFound("Internship not found");

  const payload = internship.toObject() as unknown as Record<string, unknown>;
  // never leak the company's user id
  if (payload.company && typeof payload.company === "object") delete (payload.company as Record<string, unknown>).user;

  if (user?.role === "STUDENT") {
    const [applied, saved] = await Promise.all([
      Application.findOne({ student: user.id, internship: internship._id }).select("status"),
      SavedInternship.exists({ student: user.id, internship: internship._id })
    ]);
    payload.hasApplied = !!applied;
    payload.applicationId = applied?.id;
    payload.applicationStatus = applied?.status;
    payload.isSaved = !!saved;
  }
  sendSuccess(res, payload);
});

export const createInternship = asyncHandler(async (req: Request, res: Response) => {
  const company = await getCompanyProfileOrThrow(req.user!.id);
  const internship = await Internship.create({ ...req.body, company: company._id });
  if (internship.status === "PUBLISHED") await announceInternship(internship, company.companyName, req.user!.id);
  sendSuccess(res, internship, "Internship created", 201);
});

const findOwned = async (internshipId: string, userId: string) => {
  const company = await getCompanyProfileOrThrow(userId);
  // Ownership is resolved server-side from the authenticated user, never from the request body.
  const internship = await Internship.findOne({ _id: internshipId, company: company._id });
  if (!internship || internship.status === "REMOVED") throw AppError.notFound("Internship not found");
  return { company, internship };
};

export const updateInternship = asyncHandler(async (req: Request, res: Response) => {
  const { company, internship } = await findOwned(req.params.id, req.user!.id);
  const wasPublished = internship.status === "PUBLISHED";
  if (req.body.deadline && req.body.status !== "CLOSED" && new Date(req.body.deadline).getTime() < Date.now()) {
    throw AppError.badRequest("Deadline must be in the future");
  }
  internship.set(req.body);
  await internship.save();
  if (!wasPublished && internship.status === "PUBLISHED") await announceInternship(internship, company.companyName, req.user!.id);
  sendSuccess(res, internship, "Internship updated");
});

export const deleteInternship = asyncHandler(async (req: Request, res: Response) => {
  const { internship } = await findOwned(req.params.id, req.user!.id);
  await Promise.all([
    Application.deleteMany({ internship: internship._id }),
    SavedInternship.deleteMany({ internship: internship._id }),
    internship.deleteOne()
  ]);
  sendSuccess(res, null, "Internship deleted");
});
