import { Router } from "express";
import * as ctrl from "../controllers/ai.controller";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { aiLimiter } from "../middleware/rateLimit";
import { uploadCvMemory, verifyUploadedFile } from "../middleware/upload";
import { validate } from "../middleware/validate";
import { matchInternshipSchema } from "../validators/ai.validator";

const router = Router();
router.use(authenticate, authorize("STUDENT"));

router.post("/analyze-cv", aiLimiter, uploadCvMemory, verifyUploadedFile("pdf", false), ctrl.analyzeCv);
router.post("/match-internship", aiLimiter, validate({ body: matchInternshipSchema }), ctrl.matchInternship);
router.get("/analyses", ctrl.listAnalyses);
router.get("/analyses/latest", ctrl.latestAnalysis);

export default router;
