import { Router } from "express";
import * as ctrl from "../controllers/admin.controller";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { adminListQuery, adminUsersQuery, userStatusSchema } from "../validators/admin.validator";
import { idParam } from "../validators/common";

const router = Router();
router.use(authenticate, authorize("ADMIN"));

router.get("/dashboard", ctrl.dashboard);
router.get("/analytics", ctrl.analytics);
router.get("/users", validate({ query: adminUsersQuery }), ctrl.listUsers);
router.patch("/users/:id/status", validate({ params: idParam, body: userStatusSchema }), ctrl.setUserStatus);
router.get("/internships", validate({ query: adminListQuery }), ctrl.listInternships);
router.delete("/internships/:id", validate({ params: idParam }), ctrl.removeInternship);
router.get("/applications", validate({ query: adminListQuery }), ctrl.listApplications);

export default router;
