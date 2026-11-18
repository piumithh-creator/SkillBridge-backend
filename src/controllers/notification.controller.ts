import type { Request, Response } from "express";
import { Notification } from "../models/Notification";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { buildMeta, sendSuccess } from "../utils/response";

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as { page: number; limit: number; unreadOnly?: "true" | "false" };
  const filter = { user: req.user!.id, ...(q.unreadOnly === "true" ? { isRead: false } : {}) };
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user!.id, isRead: false })
  ]);
  sendSuccess(res, items, "OK", 200, { ...buildMeta(total, q.page, q.limit), unreadCount });
});

export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, { unreadCount: await Notification.countDocuments({ user: req.user!.id, isRead: false }) });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user!.id }, { isRead: true }, { new: true });
  if (!n) throw AppError.notFound("Notification not found");
  sendSuccess(res, n, "Marked as read");
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const r = await Notification.updateMany({ user: req.user!.id, isRead: false }, { isRead: true });
  sendSuccess(res, { modified: r.modifiedCount }, "All notifications marked as read");
});
