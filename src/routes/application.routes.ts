import { Router } from "express";
import * as ctrl from "../controllers/application.controller";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { createApplicationSchema, myApplicationsQuery, receivedApplicationsQuery, updateStatusSchema } from "../validators/application.validator";
import { idParam } from "../validators/common";

const router = Router();
router.use(authenticate);

router.post("/", authorize("STUDENT"), validate({ body: createApplicationSchema }), ctrl.createApplication);
router.get("/my", authorize("STUDENT"), validate({ query: myApplicationsQuery }), ctrl.myApplications);
router.get("/received", authorize("COMPANY"), validate({ query: receivedApplicationsQuery }), ctrl.receivedApplications);
router.get("/:id", validate({ params: idParam }), ctrl.getApplication);
router.get("/:id/cv", validate({ params: idParam }), ctrl.downloadApplicantCv);
router.patch("/:id/status", authorize("COMPANY"), validate({ params: idParam, body: updateStatusSchema }), ctrl.updateStatus);
router.delete("/:id", authorize("STUDENT"), validate({ params: idParam }), ctrl.withdrawApplication);

export default router;
