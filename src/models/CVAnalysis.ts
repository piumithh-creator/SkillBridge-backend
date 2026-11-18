import { Schema, model, type Document, type Types } from "mongoose";

export interface ICVAnalysis extends Document {
  student: Types.ObjectId; // User
  fileName: string;
  score: number;
  technicalSkills: string[];
  softSkills: string[];
  education: string[];
  experience: string[];
  missingSkills: string[];
  suggestions: string[];
  formattingRecommendations: string[];
  recommendedCategories: string[];
  summary: string;
  extractedText: string;
  aiModel: string;
  createdAt: Date;
}

const cvAnalysisSchema = new Schema<ICVAnalysis>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fileName: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    technicalSkills: { type: [String], default: [] },
    softSkills: { type: [String], default: [] },
    education: { type: [String], default: [] },
    experience: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    suggestions: { type: [String], default: [] },
    formattingRecommendations: { type: [String], default: [] },
    recommendedCategories: { type: [String], default: [] },
    summary: { type: String, default: "" },
    extractedText: { type: String, select: false },
    aiModel: { type: String, default: "" }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

cvAnalysisSchema.index({ student: 1, createdAt: -1 });

export const CVAnalysis = model<ICVAnalysis>("CVAnalysis", cvAnalysisSchema);
