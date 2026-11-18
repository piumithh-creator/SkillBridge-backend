import { Schema, model, type Document, type Types } from "mongoose";

export interface IEducation {
  institution: string;
  degree: string;
  field?: string;
  startYear?: number;
  endYear?: number;
}
export interface IExperience {
  title: string;
  company: string;
  startDate?: Date;
  endDate?: Date;
  description?: string;
}

export interface IStudentProfile extends Document {
  user: Types.ObjectId;
  fullName: string;
  phone?: string;
  headline?: string;
  bio?: string;
  location?: string;
  profileImage?: string;
  technicalSkills: string[];
  softSkills: string[];
  education: IEducation[];
  experience: IExperience[];
  cvPath?: string;
  cvOriginalName?: string;
  cvUploadedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const educationSchema = new Schema<IEducation>(
  {
    institution: { type: String, required: true, trim: true, maxlength: 150 },
    degree: { type: String, required: true, trim: true, maxlength: 150 },
    field: { type: String, trim: true, maxlength: 150 },
    startYear: { type: Number, min: 1950, max: 2100 },
    endYear: { type: Number, min: 1950, max: 2100 }
  },
  { _id: true }
);

const experienceSchema = new Schema<IExperience>(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    company: { type: String, required: true, trim: true, maxlength: 150 },
    startDate: Date,
    endDate: Date,
    description: { type: String, trim: true, maxlength: 2000 }
  },
  { _id: true }
);

const studentProfileSchema = new Schema<IStudentProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 30 },
    headline: { type: String, trim: true, maxlength: 150 },
    bio: { type: String, trim: true, maxlength: 2000 },
    location: { type: String, trim: true, maxlength: 100 },
    profileImage: String,
    technicalSkills: { type: [String], default: [] },
    softSkills: { type: [String], default: [] },
    education: { type: [educationSchema], default: [] },
    experience: { type: [experienceSchema], default: [] },
    cvPath: { type: String, select: false },
    cvOriginalName: String,
    cvUploadedAt: Date
  },
  { timestamps: true }
);

export const StudentProfile = model<IStudentProfile>("StudentProfile", studentProfileSchema);
