import { Router } from "express";
import admin from "./admin.routes";
import ai from "./ai.routes";
import application from "./application.routes";
import auth from "./auth.routes";
import company from "./company.routes";
import internship from "./internship.routes";
import notification from "./notification.routes";
import report from "./report.routes";
import student from "./student.routes";

const router = Router();
router.use("/auth", auth);
router.use("/students", student);
router.use("/companies", company);
router.use("/internships", internship);
router.use("/applications", application);
router.use("/admin", admin);
router.use("/ai", ai);
router.use("/notifications", notification);
router.use("/reports", report);

export default router;
