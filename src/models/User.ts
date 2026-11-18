import { Schema, model, type Document } from "mongoose";
import { ROLES, type Role } from "../constants";

export interface IRefreshSession {
  hash: string;
  expiresAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: Role;
  isBlocked: boolean;
  refreshSessions: IRefreshSession[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"]
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, index: true },
    isBlocked: { type: Boolean, default: false, index: true },
    refreshSessions: {
      type: [{ hash: String, expiresAt: Date, _id: false }],
      default: [],
      select: false
    },
    lastLoginAt: Date
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
