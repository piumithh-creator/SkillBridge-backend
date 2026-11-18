import { z } from "zod";
import { APPLICATION_STATUSES } from "../constants";
import { objectId, pageQuery } from "./common";

export const createApplicationSchema = z.object({
  internshipId: objectId,
  coverLetter: z.string().trim().max(3000).optional()
});

export const updateStatusSchema = z.object({ status: z.enum(APPLICATION_STATUSES) });

export const myApplicationsQuery = z.object({
  ...pageQuery,
  status: z.enum(APPLICATION_STATUSES).optional()
});

export const receivedApplicationsQuery = z.object({
  ...pageQuery,
  status: z.enum(APPLICATION_STATUSES).optional(),
  internshipId: objectId.optional()
});
