import fs from "fs";
import path from "path";
import type { Request, Response } from "express";
import { cvDir } from "../middleware/upload";
import { CVAnalysis } from "../models/CVAnalysis";
import { Internship } from "../models/Internship";
import { StudentProfile } from "../models/StudentProfile";
import { extractPdfText } from "../services/cv.service";
import { analyzeCvText, matchCvToInternship } from "../services/gemini.service";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";

export const analyzeCv = asyncHandler(async (req: Request, res: Response) => {
  let buffer: Buffer;
  let fileName: string;

  if (req.file) {
    buffer = req.file.buffer; // 1. PDF validated by multer + magic bytes
    fileName = path.basename(req.file.originalname).slice(0, 150);
  } else {
    const profile = await StudentProfile.findOne({ user: req.user!.id }).select("+cvPath");
    if (!profile?.cvPath) throw AppError.badRequest("Upload a CV PDF first, or attach one to this request");
    buffer = await fs.promises.readFile(path.join(cvDir, path.basename(profile.cvPath)));
    fileName = profile.cvOriginalName ?? "cv.pdf";
  }

  const text = await extractPdfText(buffer); // 2. extract text (also re-validates PDF)
  const result = await analyzeCvText(text); // 3-5. Gemini → structured JSON → validated with Zod
  const saved = await CVAnalysis.create({ student: req.user!.id, fileName, extractedText: text, aiModel: env.GEMINI_MODEL, ...result }); // 6. persist

  const { extractedText: _omit, ...analysis } = saved.toObject();
  void _omit;
  sendSuccess(res, analysis, "CV analysed", 201); // 7. return
});

export const listAnalyses = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await CVAnalysis.find({ student: req.user!.id }).sort({ createdAt: -1 }).limit(20));
});

export const latestAnalysis = asyncHandler(async (req: Request, res: Response) => {
  const latest = await CVAnalysis.findOne({ student: req.user!.id }).sort({ createdAt: -1 });
  sendSuccess(res, latest);
});

export const matchInternship = asyncHandler(async (req: Request, res: Response) => {
  const { internshipId } = req.body as { internshipId: string };
  const internship = await Internship.findOne({ _id: internshipId, status: "PUBLISHED" });
  if (!internship) throw AppError.notFound("Internship not found");

  const analysis = await CVAnalysis.findOne({ student: req.user!.id }).sort({ createdAt: -1 }).select("+extractedText");
  if (!analysis?.extractedText) throw AppError.badRequest("Analyse your CV first so it can be matched with internships");

  const match = await matchCvToInternship(analysis.extractedText, internship);
  sendSuccess(res, { internshipId: internship.id, internshipTitle: internship.title, ...match });
});
