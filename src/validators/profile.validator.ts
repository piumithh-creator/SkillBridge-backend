import { z } from "zod";
import { skillList } from "./common";

const year = z.coerce.number().int().min(1950).max(2100).optional();

export const studentProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  headline: z.string().trim().max(150).optional(),
  bio: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(100).optional(),
  technicalSkills: skillList.optional(),
  softSkills: skillList.optional(),
  education: z
    .array(
      z.object({
        institution: z.string().trim().min(1).max(150),
        degree: z.string().trim().min(1).max(150),
        field: z.string().trim().max(150).optional(),
        startYear: year,
        endYear: year
      })
    )
    .max(10)
    .optional(),
  experience: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(150),
        company: z.string().trim().min(1).max(150),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        description: z.string().trim().max(2000).optional()
      })
    )
    .max(15)
    .optional()
});

export const companyProfileSchema = z.object({
  companyName: z.string().trim().min(2).max(150).optional(),
  industry: z.string().trim().max(100).optional(),
  website: z.string().trim().url().max(200).optional().or(z.literal("")),
  location: z.string().trim().max(100).optional(),
  size: z.string().trim().max(50).optional(),
  description: z.string().trim().max(3000).optional()
});
