import { z } from "zod";
import { INTERNSHIP_CATEGORIES, WORK_MODES } from "../constants";
import { pageQuery, skillList } from "./common";

const base = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(20).max(6000),
  category: z.enum(INTERNSHIP_CATEGORIES),
  requiredSkills: skillList.default([]),
  qualifications: z.string().trim().max(2000).default(""),
  location: z.string().trim().min(2).max(120),
  workMode: z.enum(WORK_MODES),
  duration: z.string().trim().min(1).max(60),
  stipend: z.coerce.number().min(0).default(0),
  deadline: z.coerce.date(),
  vacancies: z.coerce.number().int().min(1).max(500).default(1),
  requirements: z.string().trim().max(3000).default(""),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).default("PUBLISHED")
});

export const createInternshipSchema = base.refine((d) => d.deadline.getTime() > Date.now(), {
  path: ["deadline"],
  message: "Deadline must be in the future"
});

export const updateInternshipSchema = base.partial();

export const listInternshipsQuery = z.object({
  ...pageQuery,
  search: z.string().trim().max(100).optional(),
  category: z.enum(INTERNSHIP_CATEGORIES).optional(),
  workMode: z.enum(WORK_MODES).optional(),
  location: z.string().trim().max(100).optional(),
  minStipend: z.coerce.number().min(0).optional(),
  skills: z.string().trim().max(300).optional(),
  sort: z.enum(["newest", "deadline", "stipend"]).default("newest")
});

export const mineQuery = z.object({
  ...pageQuery,
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "REMOVED"]).optional(),
  search: z.string().trim().max(100).optional()
});
