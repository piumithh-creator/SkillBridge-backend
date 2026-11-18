import path from "path";
import mongoose from "mongoose";
import type { Request, Response } from "express";
import { APPLICATION_STATUSES } from "../constants";
import { Application } from "../models/Application";
import { Internship } from "../models/Internship";
import { CompanyProfile } from "../models/CompanyProfile";
import { StudentProfile } from "../models/StudentProfile";
import { User } from "../models/User";
import { deleteFile, imageDir } from "../middleware/upload";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { getCompanyProfileOrThrow } from "../utils/profiles";
import { sendSuccess } from "../utils/response";

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await getCompanyProfileOrThrow(req.user!.id);
  sendSuccess(res, { ...profile.toObject(), email: req.user!.email });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await CompanyProfile.findOneAndUpdate({ user: req.user!.id }, { $set: req.body }, { new: true, runValidators: true });
  if (!profile) throw AppError.notFound("Company profile not found");
  sendSuccess(res, profile, "Profile updated");
});

export const uploadLogo = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file!;
  const profile = await CompanyProfile.findOne({ user: req.user!.id });
  if (!profile) {
    deleteFile(file.path);
    throw AppError.notFound("Company profile not found");
  }
  if (profile.logo) deleteFile(path.join(imageDir, path.basename(profile.logo)));
  profile.logo = `/uploads/images/${path.basename(file.path)}`;
  await profile.save();
  sendSuccess(res, { logo: profile.logo }, "Logo updated");
});

export const dashboard = asyncHandler(async (req: Request, res: Response) => {
  const profile = await getCompanyProfileOrThrow(req.user!.id);
  const [internshipRows, appRows] = await Promise.all([
    Internship.aggregate<{ _id: string; count: number }>([{ $match: { company: profile._id } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Application.aggregate<{ _id: string; count: number }>([{ $match: { company: profile._id } }, { $group: { _id: "$status", count: { $sum: 1 } } }])
  ]);
  const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, appRows.find((r) => r._id === s)?.count ?? 0]));
  sendSuccess(res, {
    totalInternships: internshipRows.reduce((a, r) => a + r.count, 0),
    publishedInternships: internshipRows.find((r) => r._id === "PUBLISHED")?.count ?? 0,
    totalApplications: Object.values(byStatus).reduce((a, b) => a + b, 0),
    applicationsByStatus: byStatus
  });
});

/** A company may view an applicant's profile only if that student applied to one of its internships. */
export const viewApplicant = asyncHandler(async (req: Request, res: Response) => {
  const company = await getCompanyProfileOrThrow(req.user!.id);
  const studentUserId = new mongoose.Types.ObjectId(req.params.userId);
  const applied = await Application.exists({ student: studentUserId, company: company._id });
  if (!applied) throw AppError.forbidden("This student has not applied to any of your internships");
  const [profile, user] = await Promise.all([StudentProfile.findOne({ user: studentUserId }), User.findById(studentUserId).select("email name")]);
  if (!profile || !user) throw AppError.notFound("Applicant not found");
  sendSuccess(res, { ...profile.toObject(), email: user.email, hasCv: !!profile.cvOriginalName });
});
