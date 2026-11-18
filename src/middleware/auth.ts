import type { NextFunction, Request, Response } from "express";
import { User } from "../models/User";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { verifyAccessToken } from "../utils/tokens";

const extractToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
};

const loadUser = async (token: string) => {
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw AppError.unauthorized("Invalid or expired access token");
  }
  // Role and blocked state are always read from the DB, never trusted from the client/token alone.
  const user = await User.findById(payload.sub);
  if (!user) throw AppError.unauthorized("Account no longer exists");
  if (user.isBlocked) throw AppError.forbidden("This account has been blocked");
  return { id: user.id as string, role: user.role, name: user.name, email: user.email };
};

export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) throw AppError.unauthorized();
  req.user = await loadUser(token);
  next();
});

/** Attaches req.user when a valid token is present, otherwise continues anonymously. */
export const optionalAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = await loadUser(token);
    } catch {
      /* ignore – treated as anonymous */
    }
  }
  next();
});
