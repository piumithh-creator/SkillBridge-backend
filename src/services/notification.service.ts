import type { Types } from "mongoose";
import { Notification } from "../models/Notification";
import type { NotificationType } from "../constants";

type Id = string | Types.ObjectId;

/** Notifications must never break the main request, so failures are logged and swallowed. */
export const notify = async (user: Id, type: NotificationType, title: string, message: string, link?: string): Promise<void> => {
  try {
    await Notification.create({ user, type, title, message, link });
  } catch (err) {
    console.error("Failed to create notification", err);
  }
};

export const notifyMany = async (users: Id[], type: NotificationType, title: string, message: string, link?: string): Promise<void> => {
  if (!users.length) return;
  try {
    await Notification.insertMany(users.map((user) => ({ user, type, title, message, link })), { ordered: false });
  } catch (err) {
    console.error("Failed to create notifications", err);
  }
};
