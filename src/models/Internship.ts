import { Schema, model, type Document, type Types } from "mongoose";
import {
  INTERNSHIP_CATEGORIES,
  INTERNSHIP_STATUSES,
  WORK_MODES,
  type InternshipStatus,
  type WorkMode
} from "../constants";

export interface IInternship extends Document {
  company: Types.ObjectId; // CompanyProfile
  title: string;
  description: string;
  category: string;
  requiredSkills: string[];
  qualifications: string;
  location: string;
  workMode: WorkMode;
  duration: string;
  stipend: number;
  deadline: Date;
  vacancies: number;
  requirements: string;
  status: InternshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

const internshipSchema = new Schema<IInternship>(
  {
    company: { type: Schema.Types.ObjectId, ref: "CompanyProfile", required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
    description: { type: String, required: true, trim: true, maxlength: 6000 },
    category: { type: String, enum: INTERNSHIP_CATEGORIES, required: true, index: true },
    requiredSkills: { type: [String], default: [] },
    qualifications: { type: String, trim: true, default: "", maxlength: 2000 },
    location: { type: String, required: true, trim: true, maxlength: 120 },
    workMode: { type: String, enum: WORK_MODES, required: true, index: true },
    duration: { type: String, required: true, trim: true, maxlength: 60 },
    stipend: { type: Number, default: 0, min: 0 },
    deadline: { type: Date, required: true, index: true },
    vacancies: { type: Number, required: true, min: 1, default: 1 },
    requirements: { type: String, trim: true, default: "", maxlength: 3000 },
    status: { type: String, enum: INTERNSHIP_STATUSES, default: "PUBLISHED", index: true }
  },
  { timestamps: true }
);

internshipSchema.index({ title: "text", description: "text", requiredSkills: "text" });
internshipSchema.index({ status: 1, deadline: 1, createdAt: -1 });

export const Internship = model<IInternship>("Internship", internshipSchema);
