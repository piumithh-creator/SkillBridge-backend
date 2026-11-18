import { CompanyProfile } from "../models/CompanyProfile";
import { StudentProfile } from "../models/StudentProfile";
import { AppError } from "./AppError";

export const getCompanyProfileOrThrow = async (userId: string) => {
  const profile = await CompanyProfile.findOne({ user: userId });
  if (!profile) throw AppError.notFound("Company profile not found");
  return profile;
};

export const getStudentProfileOrCreate = async (userId: string, fullName: string) =>
  (await StudentProfile.findOne({ user: userId })) ?? (await StudentProfile.create({ user: userId, fullName }));
