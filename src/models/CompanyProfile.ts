import { Schema, model, type Document, type Types } from "mongoose";

export interface ICompanyProfile extends Document {
  user: Types.ObjectId;
  companyName: string;
  industry?: string;
  website?: string;
  location?: string;
  size?: string;
  description?: string;
  logo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const companyProfileSchema = new Schema<ICompanyProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    companyName: { type: String, required: true, trim: true, maxlength: 150, index: true },
    industry: { type: String, trim: true, maxlength: 100 },
    website: { type: String, trim: true, maxlength: 200 },
    location: { type: String, trim: true, maxlength: 100 },
    size: { type: String, trim: true, maxlength: 50 },
    description: { type: String, trim: true, maxlength: 3000 },
    logo: String
  },
  { timestamps: true }
);

export const CompanyProfile = model<ICompanyProfile>("CompanyProfile", companyProfileSchema);
