import { Router } from "express";
import * as ctrl from "../controllers/student.controller";
import { myApplications } from "../controllers/application.controller";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { uploadCvDisk, uploadImageDisk, verifyUploadedFile } from "../middleware/upload";
import { validate } from "../middleware/validate";
import { myApplicationsQuery } from "../validators/application.validator";
import { idParam } from "../validators/common";
import { studentProfileSchema } from "../validators/profile.validator";

const router = Router();
router.use(authenticate, authorize("STUDENT"));

router.get("/dashboard", ctrl.dashboard);
router.get("/profile", ctrl.getProfile);
router.put("/profile", validate({ body: studentProfileSchema }), ctrl.updateProfile);
router.post("/cv", uploadCvDisk, verifyUploadedFile("pdf"), ctrl.uploadCv);
router.get("/cv", ctrl.downloadOwnCv);
router.post("/profile-image", uploadImageDisk("image"), verifyUploadedFile("image"), ctrl.uploadProfileImage);
router.get("/applications", validate({ query: myApplicationsQuery }), myApplications);

router.get("/saved", ctrl.listSaved);
router.get("/saved/ids", ctrl.savedIds);
router.post("/saved/:id", validate({ params: idParam }), ctrl.saveInternship);
router.delete("/saved/:id", validate({ params: idParam }), ctrl.unsaveInternship);

export default router;
