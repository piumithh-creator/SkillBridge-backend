import { z } from "zod";
import { objectId } from "./common";

export const matchInternshipSchema = z.object({ internshipId: objectId });

const list = z.array(z.string()).default([]);

/** Shape we require Gemini to return for CV analysis – validated before saving. */
export const cvAnalysisAiSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  summary: z.string().default(""),
  technicalSkills: list,
  softSkills: list,
  education: list,
  experience: list,
  missingSkills: list,
  suggestions: list,
  formattingRecommendations: list,
  recommendedCategories: list
});

export const matchAiSchema = z.object({
  matchPercentage: z.coerce.number().min(0).max(100),
  matchingSkills: list,
  missingSkills: list,
  suggestions: list,
  summary: z.string().default("")
});
