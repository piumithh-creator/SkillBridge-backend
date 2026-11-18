import type { Request, Response } from "express";
import type { FilterQuery } from "mongoose";
import { Application } from "../models/Application";
import { CompanyProfile } from "../models/CompanyProfile";
import { Internship, type IInternship } from "../models/Internship";
import { SavedInternship } from "../models/SavedInternship";
import { StudentProfile } from "../models/StudentProfile";
import { User, type IUser } from "../models/User";
import { getAnalytics, getPlatformStats } from "../services/analytics.service";
import { notify } from "../services/notification.service";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { escapeRegex } from "../utils/pagination";
import { buildMeta, sendSuccess } from "../utils/response";

export const dashboard = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await getPlatformStats());
});

export const analytics = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await getAnalytics());
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as { page: number; limit: number; role?: string; search?: string; blocked?: "true" | "false" };
  const filter: FilterQuery<IUser> = {};
  if (q.role) filter.role = q.role;
  if (q.blocked) filter.isBlocked = q.blocked === "true";
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), "i");
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    User.countDocuments(filter)
  ]);
  const ids = users.map((u) => u._id);
  const [students, companies] = await Promise.all([
    StudentProfile.find({ user: { $in: ids } }).select("user headline location").lean(),
    CompanyProfile.find({ user: { $in: ids } }).select("user companyName industry location").lean()
  ]);
  const sMap = new Map(students.map((s) => [String(s.user), s]));
  const cMap = new Map(companies.map((c) => [String(c.user), c]));
  const data = users.map((u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    isBlocked: u.isBlocked,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    profile: sMap.get(String(u._id)) ?? cMap.get(String(u._id)) ?? null
  }));
  sendSuccess(res, data, "OK", 200, buildMeta(total, q.page, q.limit));
});

export const setUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const { isBlocked } = req.body as { isBlocked: boolean };
  const target = await User.findById(req.params.id);
  if (!target) throw AppError.notFound("User not found");
  if (target.role === "ADMIN") throw AppError.forbidden("Admin accounts cannot be blocked");
  target.isBlocked = isBlocked;
  await target.save({ validateModifiedOnly: true });
  // Revoke sessions immediately when blocking
  if (isBlocked) await User.updateOne({ _id: target._id }, { $set: { refreshSessions: [] } });
  sendSuccess(res, { id: target.id, isBlocked: target.isBlocked }, isBlocked ? "User blocked" : "User unblocked");
});

export const listInternships = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as { page: number; limit: number; status?: string; search?: string };
  const filter: FilterQuery<IInternship> = {};
  if (q.status) filter.status = q.status;
  if (q.search) filter.title = new RegExp(escapeRegex(q.search), "i");
  const [items, total] = await Promise.all([
    Internship.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).populate("company", "companyName"),
    Internship.countDocuments(filter)
  ]);
  sendSuccess(res, items, "OK", 200, buildMeta(total, q.page, q.limit));
});

/** Soft-removes an inappropriate internship (status REMOVED) so the audit trail and applications stay intact. */
export const removeInternship = asyncHandler(async (req: Request, res: Response) => {
  const internship = await Internship.findById(req.params.id).populate("company", "user");
  if (!internship) throw AppError.notFound("Internship not found");
  internship.status = "REMOVED";
  await internship.save();
  await SavedInternship.deleteMany({ internship: internship._id });
  const owner = (internship.company as unknown as { user?: unknown } | null)?.user;
  if (owner) {
    await notify(String(owner), "INTERNSHIP_REMOVED", "Internship removed", `"${internship.title}" was removed by an administrator for violating platform guidelines.`);
  }
  sendSuccess(res, { id: internship.id, status: internship.status }, "Internship removed");
});

export const listApplications = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as { page: number; limit: number; status?: string };
  const filter = q.status ? { status: q.status } : {};
  const [items, total] = await Promise.all([
    Application.find(filter)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate("student", "name email")
      .populate("internship", "title")
      .populate("company", "companyName"),
    Application.countDocuments(filter)
  ]);
  sendSuccess(res, items, "OK", 200, buildMeta(total, q.page, q.limit));
});
