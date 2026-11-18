import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import mongoose from "mongoose";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  let status = 500;
  let message = "Internal server error";
  let details: unknown;

  if (err instanceof AppError) {
    status = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof MulterError) {
    status = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "File is too large" : err.message;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = "Validation failed";
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if ((err as { code?: number })?.code === 11000) {
    status = 409;
    message = "Duplicate value – resource already exists";
  } else if ((err as { type?: string })?.type === "entity.parse.failed") {
    status = 400;
    message = "Malformed JSON body";
  }

  if (status >= 500) console.error(err);

  res.status(status).json({
    success: false,
    message,
    ...(details ? { errors: details } : {}),
    ...(!env.isProd && status >= 500 && err instanceof Error ? { stack: err.stack } : {})
  });
};
