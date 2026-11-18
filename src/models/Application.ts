import { Schema, model, type Document, type Types } from "mongoose";
import { APPLICATION_STATUSES, type ApplicationStatus } from "../constants";

export interface IApplication extends Document {
  student: Types.ObjectId; // User
  internship: Types.ObjectId;
  company: Types.ObjectId; // CompanyProfile (denormalised for fast company queries)
  coverLetter?: string;
  status: ApplicationStatus;
  statusHistory: { status: ApplicationStatus; changedAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    internship: { type: Schema.Types.ObjectId, ref: "Internship", required: true, index: true },
    company: { type: Schema.Types.ObjectId, ref: "CompanyProfile", required: true, index: true },
    coverLetter: { type: String, trim: true, maxlength: 3000 },
    status: { type: String, enum: APPLICATION_STATUSES, default: "PENDING", index: true },
    statusHistory: {
      type: [{ status: { type: String, enum: APPLICATION_STATUSES }, changedAt: Date, _id: false }],
      default: []
    }
  },
  { timestamps: true }
);

// Duplicate application prevention enforced at DB level
applicationSchema.index({ student: 1, internship: 1 }, { unique: true });

export const Application = model<IApplication>("Application", applicationSchema);
