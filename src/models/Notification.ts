import { Schema, model, type Document, type Types } from "mongoose";
import { NOTIFICATION_TYPES, type NotificationType } from "../constants";

export interface INotification extends Document {
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 150 },
    message: { type: String, required: true, maxlength: 500 },
    link: String,
    isRead: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export const Notification = model<INotification>("Notification", notificationSchema);
