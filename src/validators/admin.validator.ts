import { z } from "zod";
import { ROLES } from "../constants";
import { pageQuery } from "./common";

export const userStatusSchema = z.object({ isBlocked: z.boolean() });

export const adminUsersQuery = z.object({
  ...pageQuery,
  role: z.enum(ROLES).optional(),
  search: z.string().trim().max(100).optional(),
  blocked: z.enum(["true", "false"]).optional()
});

export const adminListQuery = z.object({
  ...pageQuery,
  status: z.string().trim().max(20).optional(),
  search: z.string().trim().max(100).optional()
});
