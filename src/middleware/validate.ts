import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { AppError } from "../utils/AppError";

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export const validate =
  (schemas: Schemas) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    for (const key of ["body", "query", "params"] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key]);
      if (!result.success) {
        const issues = result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
        return next(AppError.badRequest("Validation failed", issues));
      }
      (req as unknown as Record<string, unknown>)[key] = result.data;
    }
    next();
  };
