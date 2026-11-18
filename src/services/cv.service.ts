import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { AppError } from "../utils/AppError";
import { isPdf } from "../utils/fileSignature";

const MAX_CHARS = 15000;
const MIN_CHARS = 100;

export const extractPdfText = async (buffer: Buffer): Promise<string> => {
  if (!isPdf(buffer)) throw AppError.badRequest("File is not a valid PDF");
  let text = "";
  try {
    const result = await pdfParse(buffer);
    text = (result.text ?? "").replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  } catch {
    throw AppError.badRequest("Could not read the PDF. It may be corrupted or password protected");
  }
  if (text.length < MIN_CHARS) {
    throw AppError.badRequest("Not enough readable text found in the PDF (scanned images are not supported)");
  }
  return text.slice(0, MAX_CHARS);
};
