import type { Response } from "express";

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = "OK",
  status = 200,
  meta?: PageMeta | Record<string, unknown>
): Response => res.status(status).json({ success: true, message, data, ...(meta ? { meta } : {}) });

export const buildMeta = (total: number, page: number, limit: number): PageMeta => ({
  total,
  page,
  limit,
  totalPages: Math.max(1, Math.ceil(total / limit))
});
