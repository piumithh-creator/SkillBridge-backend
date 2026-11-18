import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { MAX_CV_BYTES, MAX_IMAGE_BYTES } from "../constants";
import { AppError } from "../utils/AppError";
import { isImage, isPdf } from "../utils/fileSignature";

export const uploadRoot = path.resolve(env.UPLOAD_DIR);
export const cvDir = path.join(uploadRoot, "cvs");
export const imageDir = path.join(uploadRoot, "images");
[cvDir, imageDir].forEach((d) => fs.mkdirSync(d, { recursive: true }));

const diskFor = (dir: string, ext: (mimetype: string) => string) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    // Random server-side names – the client filename is never used on disk (path traversal safe)
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${ext(file.mimetype)}`)
  });

const pdfFilter: multer.Options["fileFilter"] = (_req, file, cb) =>
  file.mimetype === "application/pdf" ? cb(null, true) : cb(AppError.badRequest("Only PDF files are allowed"));

const imageFilter: multer.Options["fileFilter"] = (_req, file, cb) =>
  ["image/png", "image/jpeg"].includes(file.mimetype)
    ? cb(null, true)
    : cb(AppError.badRequest("Only PNG or JPEG images are allowed"));

export const uploadCvDisk = multer({ storage: diskFor(cvDir, () => ".pdf"), fileFilter: pdfFilter, limits: { fileSize: MAX_CV_BYTES, files: 1 } }).single("cv");
export const uploadCvMemory = multer({ storage: multer.memoryStorage(), fileFilter: pdfFilter, limits: { fileSize: MAX_CV_BYTES, files: 1 } }).single("cv");
export const uploadImageDisk = (field: string) =>
  multer({ storage: diskFor(imageDir, (m) => (m === "image/png" ? ".png" : ".jpg")), fileFilter: imageFilter, limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }).single(field);

const removeQuietly = (p?: string) => {
  if (p) fs.promises.unlink(p).catch(() => undefined);
};

/** Verifies magic bytes after upload (mimetype headers can be spoofed). Deletes invalid files. */
export const verifyUploadedFile =
  (kind: "pdf" | "image", required = true) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        if (required) throw AppError.badRequest("No file uploaded");
        return next();
      }
      const buf = file.buffer ?? (await fs.promises.readFile(file.path));
      const ok = kind === "pdf" ? isPdf(buf) : isImage(buf);
      if (!ok) {
        removeQuietly(file.path);
        throw AppError.badRequest(kind === "pdf" ? "File is not a valid PDF" : "File is not a valid PNG/JPEG image");
      }
      next();
    } catch (e) {
      next(e);
    }
  };

export const deleteFile = removeQuietly;
