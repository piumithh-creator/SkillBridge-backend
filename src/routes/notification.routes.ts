import { Router } from "express";
import * as ctrl from "../controllers/notification.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/common";
import { notificationsQuery } from "../validators/notification.validator";

const router = Router();
router.use(authenticate);

router.get("/", validate({ query: notificationsQuery }), ctrl.listNotifications);
router.get("/unread-count", ctrl.unreadCount);
router.patch("/read-all", ctrl.markAllRead);
router.patch("/:id/read", validate({ params: idParam }), ctrl.markRead);

export default router;
