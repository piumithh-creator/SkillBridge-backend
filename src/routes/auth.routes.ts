import { Router } from "express";
import * as ctrl from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";
import { validate } from "../middleware/validate";
import { loginSchema, registerSchema } from "../validators/auth.validator";

const router = Router();

router.post("/register", authLimiter, validate({ body: registerSchema }), ctrl.register);
router.post("/login", authLimiter, validate({ body: loginSchema }), ctrl.login);
router.post("/refresh", authLimiter, ctrl.refresh);
router.post("/logout", ctrl.logout);
router.get("/me", authenticate, ctrl.me);

export default router;
