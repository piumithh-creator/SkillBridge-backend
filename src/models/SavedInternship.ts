import { Schema, model, type Document, type Types } from "mongoose";

export interface ISavedInternship extends Document {
  student: Types.ObjectId; // User
  internship: Types.ObjectId;
  createdAt: Date;
}

const savedInternshipSchema = new Schema<ISavedInternship>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    internship: { type: Schema.Types.ObjectId, ref: "Internship", required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

savedInternshipSchema.index({ student: 1, internship: 1 }, { unique: true });

export const SavedInternship = model<ISavedInternship>("SavedInternship", savedInternshipSchema);
