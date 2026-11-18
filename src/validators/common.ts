import { z } from "zod";
import mongoose from "mongoose";

export const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid id");
export const idParam = z.object({ id: objectId });

export const pageQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10)
};

export const skillList = z
  .array(z.string().trim().min(1).max(50))
  .max(40)
  .transform((arr) => Array.from(new Set(arr.map((s) => s.trim()))));
