import rateLimit from "express-rate-limit";
import { env } from "../config/env";

const make = (windowMs: number, limit: number, message: string) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.isTest,
    message: { success: false, message }
  });

export const globalLimiter = make(15 * 60 * 1000, 600, "Too many requests, please try again later");
export const authLimiter = make(15 * 60 * 1000, 30, "Too many authentication attempts, please try again later");
export const aiLimiter = make(60 * 60 * 1000, 20, "AI request limit reached, please try again later");
