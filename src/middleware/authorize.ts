import type { NextFunction, Request, Response } from "express";
import type { Role } from "../constants";
import { AppError } from "../utils/AppError";

export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
