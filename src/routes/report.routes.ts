import { Router } from "express";
import * as ctrl from "../controllers/report.controller";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/common";

const router = Router();
router.use(authenticate);

router.get("/student/applications", authorize("STUDENT"), ctrl.studentApplications);
router.get("/student/cv-analysis", authorize("STUDENT"), ctrl.studentCvAnalysis);
router.get("/company/applicants", authorize("COMPANY"), ctrl.companyApplicants);
router.get("/company/internships/:id", authorize("COMPANY"), validate({ params: idParam }), ctrl.companyInternship);
router.get("/admin/platform", authorize("ADMIN"), ctrl.adminPlatform);

export default router;
