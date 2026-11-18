import { Router } from "express";
import { z } from "zod";
import * as ctrl from "../controllers/company.controller";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { uploadImageDisk, verifyUploadedFile } from "../middleware/upload";
import { validate } from "../middleware/validate";
import { objectId } from "../validators/common";
import { companyProfileSchema } from "../validators/profile.validator";

const router = Router();
router.use(authenticate, authorize("COMPANY"));

router.get("/dashboard", ctrl.dashboard);
router.get("/profile", ctrl.getProfile);
router.put("/profile", validate({ body: companyProfileSchema }), ctrl.updateProfile);
router.post("/logo", uploadImageDisk("logo"), verifyUploadedFile("image"), ctrl.uploadLogo);
router.get("/applicants/:userId", validate({ params: z.object({ userId: objectId }) }), ctrl.viewApplicant);

export default router;
