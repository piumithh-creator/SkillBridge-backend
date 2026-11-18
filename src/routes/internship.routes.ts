import { Router } from "express";
import * as ctrl from "../controllers/internship.controller";
import { authenticate, optionalAuth } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/common";
import { createInternshipSchema, listInternshipsQuery, mineQuery, updateInternshipSchema } from "../validators/internship.validator";

const router = Router();

router.get("/", validate({ query: listInternshipsQuery }), ctrl.listInternships);
router.get("/mine", authenticate, authorize("COMPANY"), validate({ query: mineQuery }), ctrl.listMine);
router.get("/:id", optionalAuth, validate({ params: idParam }), ctrl.getInternship);
router.post("/", authenticate, authorize("COMPANY"), validate({ body: createInternshipSchema }), ctrl.createInternship);
router.put("/:id", authenticate, authorize("COMPANY"), validate({ params: idParam, body: updateInternshipSchema }), ctrl.updateInternship);
router.delete("/:id", authenticate, authorize("COMPANY"), validate({ params: idParam }), ctrl.deleteInternship);

export default router;
