import path from "path";
import mongoose from "mongoose";
import type { Request, Response } from "express";
import { Application } from "../models/Application";
import { Internship } from "../models/Internship";
import { SavedInternship } from "../models/SavedInternship";
import { StudentProfile } from "../models/StudentProfile";
import { APPLICATION_STATUSES } from "../constants";
import { cvDir, deleteFile, imageDir } from "../middleware/upload";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { getStudentProfileOrCreate } from "../utils/profiles";
import { buildMeta, sendSuccess } from "../utils/response";
import { parsePagination } from "../utils/pagination";

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await getStudentProfileOrCreate(req.user!.id, req.user!.name);
  sendSuccess(res, { ...profile.toObject(), email: req.user!.email, hasCv: !!profile.cvOriginalName });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  await getStudentProfileOrCreate(req.user!.id, req.user!.name);
  // `user` is never taken from the body – only whitelisted validated fields reach $set
  const profile = await StudentProfile.findOneAndUpdate({ user: req.user!.id }, { $set: req.body }, { new: true, runValidators: true });
  sendSuccess(res, profile, "Profile updated");
});

export const uploadCv = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file!;
  const profile = await StudentProfile.findOne({ user: req.user!.id }).select("+cvPath");
  if (!profile) {
    deleteFile(file.path);
    throw AppError.notFound("Student profile not found");
  }
  if (profile.cvPath) deleteFile(path.join(cvDir, path.basename(profile.cvPath)));
  profile.cvPath = path.basename(file.path);
  profile.cvOriginalName = path.basename(file.originalname).slice(0, 150);
  profile.cvUploadedAt = new Date();
  await profile.save();
  sendSuccess(res, { cvOriginalName: profile.cvOriginalName, cvUploadedAt: profile.cvUploadedAt }, "CV uploaded", 201);
});

export const downloadOwnCv = asyncHandler(async (req: Request, res: Response) => {
  const profile = await StudentProfile.findOne({ user: req.user!.id }).select("+cvPath");
  if (!profile?.cvPath) throw AppError.notFound("No CV uploaded");
  res.download(path.join(cvDir, path.basename(profile.cvPath)), profile.cvOriginalName ?? "cv.pdf");
});

export const uploadProfileImage = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file!;
  const profile = await StudentProfile.findOne({ user: req.user!.id });
  if (!profile) {
    deleteFile(file.path);
    throw AppError.notFound("Student profile not found");
  }
  if (profile.profileImage) deleteFile(path.join(imageDir, path.basename(profile.profileImage)));
  profile.profileImage = `/uploads/images/${path.basename(file.path)}`;
  await profile.save();
  sendSuccess(res, { profileImage: profile.profileImage }, "Profile image updated");
});

export const dashboard = asyncHandler(async (req: Request, res: Response) => {
  const rows = await Application.aggregate<{ _id: string; count: number }>([
    { $match: { student: new mongoose.Types.ObjectId(req.user!.id) } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);
  const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, rows.find((r) => r._id === s)?.count ?? 0]));
  const saved = await SavedInternship.countDocuments({ student: req.user!.id });
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  sendSuccess(res, {
    totalApplications: total,
    pendingApplications: byStatus.PENDING,
    shortlistedApplications: byStatus.SHORTLISTED,
    rejectedApplications: byStatus.REJECTED,
    acceptedApplications: byStatus.ACCEPTED,
    reviewingApplications: byStatus.REVIEWING,
    savedInternships: saved
  });
});

export const listSaved = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { student: req.user!.id };
  const [items, total] = await Promise.all([
    SavedInternship.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "internship", populate: { path: "company", select: "companyName logo location" } }),
    SavedInternship.countDocuments(filter)
  ]);
  sendSuccess(res, items.filter((i) => i.internship), "OK", 200, buildMeta(total, page, limit));
});

export const savedIds = asyncHandler(async (req: Request, res: Response) => {
  const items = await SavedInternship.find({ student: req.user!.id }).select("internship");
  sendSuccess(res, items.map((i) => String(i.internship)));
});

export const saveInternship = asyncHandler(async (req: Request, res: Response) => {
  const internship = await Internship.findOne({ _id: req.params.id, status: "PUBLISHED" });
  if (!internship) throw AppError.notFound("Internship not found");
  await SavedInternship.updateOne(
    { student: req.user!.id, internship: internship._id },
    { $setOnInsert: { student: req.user!.id, internship: internship._id } },
    { upsert: true }
  );
  sendSuccess(res, { internshipId: internship.id }, "Internship saved", 201);
});

export const unsaveInternship = asyncHandler(async (req: Request, res: Response) => {
  await SavedInternship.deleteOne({ student: req.user!.id, internship: req.params.id });
  sendSuccess(res, null, "Removed from saved internships");
});
