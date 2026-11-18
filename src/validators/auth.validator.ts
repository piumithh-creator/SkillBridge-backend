import { z } from "zod";
import { REGISTRABLE_ROLES } from "../constants";

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72)
  .regex(/[A-Za-z]/, "Password needs a letter")
  .regex(/[0-9]/, "Password needs a number");

// `role` only accepts STUDENT or COMPANY – ADMIN registration is impossible by design.
export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email(),
    password,
    role: z.enum(REGISTRABLE_ROLES),
    companyName: z.string().trim().min(2).max(150).optional()
  })
  .refine((d) => d.role !== "COMPANY" || !!d.companyName, {
    path: ["companyName"],
    message: "Company name is required for company accounts"
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1)
});
