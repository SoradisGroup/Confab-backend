import { Router } from "express";
import { sendCareerEmail } from "../controllers/careerController.js";

const router = Router();

// POST /api/career
router.post("/sendMail", sendCareerEmail);

export default router;
